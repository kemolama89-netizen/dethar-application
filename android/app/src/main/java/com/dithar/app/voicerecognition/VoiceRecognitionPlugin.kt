package com.dithar.app.voicerecognition

import android.Manifest
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Native replacement for the browser Web Speech API's SpeechRecognition,
 * used by Voice Tasbeeh (src/lib/useVoiceTasbeeh.ts) ONLY on native
 * Android — see nativeSpeechRecognitionAdapter.ts, the sole JS-side
 * consumer of this plugin. Added because Android's embedded WebView
 * accepts a SpeechRecognition session (onstart fires) but never actually
 * engages its recognition backend (onaudiostart/onspeechstart/onresult
 * never fire, confirmed via the temporary pipeline diagnostic) — a
 * platform limitation of embedded WebView, not fixable from JS. This
 * plugin instead drives Android's own `android.speech.SpeechRecognizer`
 * directly, which does not have that limitation.
 *
 * Deliberately thin: this plugin owns ONLY the native recognizer session
 * lifecycle (start/stop/abort one Android "utterance" listening pass,
 * translate its callbacks into events). It knows nothing about dhikr
 * matching, counting, or duplicate prevention — all of that stays
 * entirely inside VoiceTasbeehMatcher (voiceTasbeehMatch.ts), reached via
 * the SAME processSegment() call the browser path already used, now fed
 * by nativeSpeechRecognitionAdapter.ts instead of a real
 * webkitSpeechRecognition object.
 *
 * `sessionId` (a per-session string minted by the JS adapter, not by this
 * plugin) is echoed back on every emitted event and checked against
 * `activeSessionId` before acting on any RecognitionListener callback —
 * this is the SAME staleness-guard pattern useVoiceTasbeeh.ts's own
 * `recognitionRef.current !== recognition` check already uses at the JS
 * level, re-applied here natively so a callback from an already-
 * superseded/aborted SpeechRecognizer instance can never be mistaken for
 * the current one.
 */
@CapacitorPlugin(
    name = "VoiceRecognition",
    permissions = [Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "microphone")],
)
class VoiceRecognitionPlugin : Plugin() {
    private var recognizer: SpeechRecognizer? = null
    private var activeSessionId: String? = null

    // LIFECYCLE FIX — see doStartSession's own comment. mainHandler
    // schedules the throttled (re)start; pendingStartRunnable/
    // lastRecognizerCreateAtMs are its bookkeeping (cancelled/read from
    // resetForRestart()/hardTeardownRecognizer() and doStartSession —
    // always on the UI thread, so no separate synchronization is needed).
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingStartRunnable: Runnable? = null
    private var lastRecognizerCreateAtMs: Long = 0L

    // TEMPORARY DIAGNOSTIC — added 2026-09-19 to investigate
    // ERROR_TOO_MANY_REQUESTS still recurring despite the restart-spacing
    // throttle (see doStartSession/doCreateAndStart). identityHashCode lets
    // logcat immediately reveal if Capacitor were ever recreating this
    // plugin object (which would silently reset recognizer/
    // lastRecognizerCreateAtMs and defeat the throttle without any flaw in
    // the guard's own logic) rather than reusing one instance for the
    // Activity's lifetime, as everything above assumes. callSeq gives every
    // logged lifecycle event below a single global ordering, so overlapping
    // calls are unambiguous even when two timestamps happen to collide.
    private val pluginInstanceId = System.identityHashCode(this)
    private val callSeq = java.util.concurrent.atomic.AtomicInteger(0)

    // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above. One
    // shared log line shape for every lifecycle-affecting call
    // (startSession/stopSession/abortSession/resetForRestart/
    // hardTeardownRecognizer/doCreateAndStart's own create/startListening
    // calls), each tagged with its own event name. Always includes the
    // calling thread — Capacitor
    // does not guarantee @PluginMethod calls run on the UI thread, so this
    // also confirms/rules out cross-thread reads of `recognizer` before the
    // `activity.runOnUiThread { … }` hop.
    private fun lifecycleLog(event: String, sessionId: String?, extra: String = "") {
        Log.d(
            TAG,
            "$event seq=${callSeq.incrementAndGet()} pluginInstance=$pluginInstanceId thread=${Thread.currentThread().name} " +
                "tRealtime=${SystemClock.elapsedRealtime()} sessionId=$sessionId activeSessionId=$activeSessionId recognizerNonNull=${recognizer != null}" +
                (if (extra.isEmpty()) "" else " $extra"),
        )
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val result = JSObject()
        result.put("available", SpeechRecognizer.isRecognitionAvailable(context))
        call.resolve(result)
    }

    @PluginMethod
    fun startSession(call: PluginCall) {
        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        // Logged before the permission check so EVERY JS-triggered call
        // attempt is captured, even one that ends up routed through the
        // async requestPermissionForAlias callback path.
        lifecycleLog("startSession:entry", call.getString("sessionId"))
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "startSessionPermsCallback")
            return
        }
        doStartSession(call)
    }

    @PermissionCallback
    private fun startSessionPermsCallback(call: PluginCall) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            doStartSession(call)
        } else {
            // A clear, distinguishable rejection — nativeSpeechRecognitionAdapter.ts
            // maps a rejected startSession() to firing onerror("not-allowed"),
            // the same status branch a genuine browser permission denial
            // already used, so this surfaces through the existing
            // status/message UI unchanged.
            call.reject("Microphone permission was denied")
        }
    }

    private fun doStartSession(call: PluginCall) {
        val sessionId = call.getString("sessionId")
        val language = call.getString("language") ?: DEFAULT_LANGUAGE
        if (sessionId == null) {
            call.reject("sessionId is required")
            return
        }

        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        lifecycleLog("doStartSession:entry", sessionId)

        // TEMPORARY DIAGNOSTIC — added 2026-09-19 to investigate the
        // "onstart=0 onerror=1610" APK report (recognition fails before
        // ever reaching onReadyForSpeech). Read-only logging only; no
        // behavior below is changed by it. Capture via
        // `adb logcat -s DitharVoiceRecog`.
        //
        // LATENCY FIX — added 2026-09-19. This used to also log
        // `boundServices=${describeBoundRecognitionServices()}` (a
        // PackageManager.queryIntentServices() scan) and a separate
        // `micDiagnostics` line that opened a throwaway AudioRecord and
        // queried AppOpsManager/AudioManager — all added to investigate a
        // suspected ERROR_AUDIO. That investigation concluded the real,
        // persistent blocker was actually ERROR_TOO_MANY_REQUESTS (see the
        // restart-spacing throttle below), never audio hardware — so this
        // real, synchronous system I/O (package manager scan + audio HAL
        // open/close + two binder calls) was running on EVERY single
        // session start, INCLUDING the one immediately after a dhikr
        // target switch, adding real, measurable latency before the
        // SpeechRecognizer itself was even created. Removed now that the
        // investigation it served is concluded; `isRecognitionAvailable`
        // alone is kept since the availability gate below needs it anyway.
        val availableForRecognition = SpeechRecognizer.isRecognitionAvailable(context)
        Log.d(
            TAG,
            "startSession sessionId=$sessionId language=$language " +
                "isRecognitionAvailable=$availableForRecognition previousRecognizerActive=${recognizer != null}",
        )

        if (!availableForRecognition) {
            // A device with no bound android.speech.RecognitionService at
            // all (no Google app / no equivalent installed) — distinct
            // from a permission problem. Mapped by the JS adapter to
            // onerror("service-not-allowed"), the same code the Web
            // Speech API spec itself uses for "the recognition service
            // refused," so this is a spec-accurate reuse, not a hack.
            call.reject("No speech recognition service is available on this device")
            return
        }

        activity.runOnUiThread {
            // LIFECYCLE FIX — added 2026-09-19. CONFIRMED root cause (real
            // device logcat): three sessions were starting within
            // milliseconds of each other while the previous recognizer was
            // still active, tripping Android's own
            // ERROR_TOO_MANY_REQUESTS(10) throttle before onReadyForSpeech
            // ever fired. SpeechRecognizer.destroy() only REQUESTS teardown
            // — it does not block until the recognition service has
            // actually released the session — so immediately
            // creating+starting a new one back-to-back on the same tick
            // (the previous, simpler version of this code) could hit that
            // OS-level rate limit on any fast restart cycle (e.g. a
            // recognizer that errors out repeatedly with near-zero gap
            // between attempts).
            //
            // Fix: never let two createSpeechRecognizer()+startListening()
            // calls happen closer together than MIN_RESTART_INTERVAL_MS.
            // Deliberately NOT a flat delay on every restart (that would
            // needlessly slow down ordinary restarts, which are already
            // naturally spaced by real seconds-long recognition sessions)
            // — only the REMAINING time needed to reach that minimum is
            // waited, so a normal, well-spaced restart still runs
            // immediately with zero added latency.
            val hadPreviousRecognizer = recognizer != null
            // LATENCY FIX — added 2026-09-20. resetForRestart(), NOT
            // hardTeardownRecognizer() — see resetForRestart's own comment
            // for why an ordinary restart deliberately keeps the
            // SpeechRecognizer object alive for doCreateAndStart to reuse,
            // instead of destroying it here.
            resetForRestart()
            activeSessionId = sessionId

            val elapsedSinceLastCreate = SystemClock.elapsedRealtime() - lastRecognizerCreateAtMs
            val waitMs = if (hadPreviousRecognizer) (MIN_RESTART_INTERVAL_MS - elapsedSinceLastCreate).coerceAtLeast(0) else 0L

            if (waitMs > 0) {
                // Busy/starting guard: a still-pending scheduled start from
                // an EARLIER call (there shouldn't be one — resetForRestart()
                // above just cancelled it — but this stays correct even if
                // that ordering ever changes) is superseded by this newest
                // request; only the latest request is ever allowed to
                // actually run, same "always the newest, discard the rest"
                // rule the JS side already applies to its own instances.
                Log.d(
                    TAG,
                    "doStartSession throttling restart sessionId=$sessionId waitMs=$waitMs " +
                        "(previous recognizer created ${elapsedSinceLastCreate}ms ago — enforcing ${MIN_RESTART_INTERVAL_MS}ms minimum spacing to avoid ERROR_TOO_MANY_REQUESTS)",
                )
                val runnable = Runnable {
                    pendingStartRunnable = null
                    // Superseded while waiting (a newer startSession, or a
                    // stop/abort, arrived before this fired) — a no-op.
                    if (activeSessionId == sessionId) doCreateAndStart(sessionId, language)
                }
                pendingStartRunnable = runnable
                mainHandler.postDelayed(runnable, waitMs)
            } else {
                doCreateAndStart(sessionId, language)
            }
            call.resolve()
        }
    }

    // Actually creates and starts the native SpeechRecognizer for
    // `sessionId` — split out from doStartSession so the throttle above can
    // call it either immediately or after the minimum-spacing delay.
    private fun doCreateAndStart(sessionId: String, language: String) {
        // LATENCY FIX — added 2026-09-20 to investigate the reported "first
        // word/repetition missed right after a dhikr switch". CONFIRMED
        // cause: every restart (target-switch included) was destroying the
        // previous SpeechRecognizer and constructing a brand-new one, which
        // has to (re)bind to the recognition service from scratch — the
        // dominant cost in "ready for speech" latency. By the time this
        // function runs, the PREVIOUS session (if any) has always already
        // concluded (onResults/onError already fired — that's what
        // triggers the JS-side onend that leads to every restart except
        // the very first), so there is nothing to lose by reusing it:
        // Android's own documented SpeechRecognizer usage pattern is
        // exactly this — call startListening() again on the SAME instance
        // for a new pass; destroy() is only for when it won't be used
        // again (see hardTeardownRecognizer, used by abortSession/
        // handleOnDestroy, never here). This skips the service (re)bind
        // entirely on a warm restart. Orthogonal to, and layered
        // underneath, the MIN_RESTART_INTERVAL_MS throttle above — that
        // throttle guards startListening() CALL RATE, not object identity,
        // so reuse cannot reintroduce ERROR_TOO_MANY_REQUESTS. At no point
        // does this create a second live recognizer — `recognizer` is
        // still exactly one reference, reused rather than replaced.
        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        val existingRecognizer = recognizer
        lifecycleLog("doCreateAndStart:beforeCreateOrReuse", sessionId, "reusing=${existingRecognizer != null}")
        lastRecognizerCreateAtMs = SystemClock.elapsedRealtime()
        val newRecognizer = existingRecognizer ?: SpeechRecognizer.createSpeechRecognizer(context)
        recognizer = newRecognizer
        lifecycleLog("doCreateAndStart:afterCreateOrReuse", sessionId, "reused=${existingRecognizer != null}")

        // TEMPORARY DIAGNOSTIC — see startSession's own log line above.
        // Proves/disproves whether onReadyForSpeech is EVER reached for
        // this session before it errors out.
        var hadReadyForSpeech = false

        newRecognizer.setRecognitionListener(
            object : RecognitionListener {
                private fun isCurrent() = activeSessionId == sessionId

                override fun onReadyForSpeech(params: Bundle?) {
                    if (!isCurrent()) return
                    hadReadyForSpeech = true
                    Log.d(TAG, "onReadyForSpeech sessionId=$sessionId")
                    notifyListeners(EVENT_SESSION_START, sessionEvent(sessionId))
                }

                override fun onBeginningOfSpeech() {
                    if (!isCurrent()) return
                    notifyListeners(EVENT_SPEECH_START, sessionEvent(sessionId))
                }

                override fun onEndOfSpeech() {
                    if (!isCurrent()) return
                    notifyListeners(EVENT_SPEECH_END, sessionEvent(sessionId))
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    if (!isCurrent()) return
                    val text = bestTranscript(partialResults)
                    notifyListeners(EVENT_RESULT, resultEvent(sessionId, text, isFinal = false))
                }

                override fun onResults(results: Bundle?) {
                    if (!isCurrent()) return
                    val text = bestTranscript(results)
                    notifyListeners(EVENT_RESULT, resultEvent(sessionId, text, isFinal = true))
                    // Android's onResults always concludes this
                    // listening session — no further callback follows
                    // it — exactly like the browser firing a final
                    // onresult immediately before its own onend for
                    // the same session.
                    notifyListeners(EVENT_SESSION_END, sessionEvent(sessionId))
                }

                override fun onError(error: Int) {
                    if (!isCurrent()) return
                    // TEMPORARY DIAGNOSTIC — see startSession's log line
                    // above. `mapErrorCode` below collapses the real
                    // Android SpeechRecognizer.ERROR_* int into the Web
                    // Speech API's small onerror vocabulary (by design,
                    // so useVoiceTasbeeh.ts's existing status mapping
                    // keeps working unchanged) — which also means that
                    // vocabulary alone cannot tell two very different
                    // native failures apart. rawErrorName/hadReadyForSpeech
                    // are logged here AND round-tripped to JS via the
                    // spec's own SpeechRecognitionErrorEvent.message
                    // field (never consumed by any matching/lifecycle
                    // decision — purely for the diagnostic panel/log).
                    val rawName = describeErrorCode(error)
                    Log.e(TAG, "onError sessionId=$sessionId rawCode=$error rawName=$rawName hadReadyForSpeech=$hadReadyForSpeech")
                    notifyListeners(
                        EVENT_ERROR,
                        errorEvent(sessionId, mapErrorCode(error), message = "android:$error:$rawName readyForSpeech=$hadReadyForSpeech"),
                    )
                    // Same reasoning as onResults above: an error also
                    // always ends this listening session.
                    notifyListeners(EVENT_SESSION_END, sessionEvent(sessionId))
                }

                override fun onRmsChanged(rmsdB: Float) {}

                override fun onBufferReceived(buffer: ByteArray?) {}

                override fun onEvent(eventType: Int, params: Bundle?) {}
            },
        )

        val intent =
            Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
            }
        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        // startListening() itself can throw synchronously
        // (SecurityException, IllegalArgumentException) rather than
        // going through onError at all — previously unlogged, which
        // could silently swallow a real cause distinct from any
        // RecognitionListener callback.
        lifecycleLog("doCreateAndStart:beforeStartListening", sessionId)
        try {
            newRecognizer.startListening(intent)
            lifecycleLog("doCreateAndStart:startListeningReturned", sessionId)
        } catch (e: Exception) {
            lifecycleLog("doCreateAndStart:startListeningThrew", sessionId, "exception=${e.message}")
        }
    }

    @PluginMethod
    fun stopSession(call: PluginCall) {
        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        lifecycleLog("stopSession:entry", activeSessionId)
        activity.runOnUiThread {
            // Graceful stop — Android finishes processing already-captured
            // audio and still delivers a final onResults/onError (and thus
            // sessionEnd) for it, same "let it finish" contract the
            // browser path's stop() (vs abort()) relies on for a
            // trailing completion at a target switch.
            lifecycleLog("stopSession:beforeStopListening", activeSessionId)
            recognizer?.stopListening()
            lifecycleLog("stopSession:afterStopListening", activeSessionId)
        }
        call.resolve()
    }

    @PluginMethod
    fun abortSession(call: PluginCall) {
        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        lifecycleLog("abortSession:entry", activeSessionId)
        activity.runOnUiThread {
            // A real, final teardown (feature disabled, idle timeout, or
            // recognizer-health-stall recovery) — NOT an ordinary restart
            // (see resetForRestart, used by doStartSession instead) — so
            // the SpeechRecognizer is fully released here, matching this
            // method's existing contract.
            hardTeardownRecognizer()
        }
        call.resolve()
    }

    // Clears the pending-restart/session-identity bookkeeping ahead of an
    // ORDINARY restart (doStartSession's only caller) — error-driven or a
    // dhikr target switch alike. Deliberately does NOT cancel()/destroy()
    // the SpeechRecognizer object itself: see doCreateAndStart's own
    // comment for why every restart already runs after the previous
    // session has genuinely concluded, making the object safe to reuse
    // there rather than destroy it here only to immediately construct an
    // equivalent replacement.
    private fun resetForRestart() {
        // LIFECYCLE FIX — see doStartSession's own comment above. A
        // scheduled-but-not-yet-fired restart (from the minimum-spacing
        // throttle) must never fire after this — otherwise a stop()/abort()
        // or a newer startSession could be followed by a stale delayed
        // start nothing asked for anymore.
        pendingStartRunnable?.let { mainHandler.removeCallbacks(it) }
        pendingStartRunnable = null
        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        lifecycleLog("resetForRestart:entry", activeSessionId)
        // Invalidated so any callback already queued on this thread from
        // the previous session is rejected by isCurrent() rather than
        // acting on a session nothing cares about anymore — same reasoning
        // as hardTeardownRecognizer's own activeSessionId reset below, just
        // without also destroying the recognizer object.
        activeSessionId = null
    }

    // Full, real teardown — used only when the feature is actually
    // stopping (abortSession/handleOnDestroy), never for an ordinary
    // restart (see resetForRestart, doStartSession's own reset instead).
    private fun hardTeardownRecognizer() {
        pendingStartRunnable?.let { mainHandler.removeCallbacks(it) }
        pendingStartRunnable = null
        val hadRecognizer = recognizer != null
        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        lifecycleLog("hardTeardownRecognizer:entry", activeSessionId, "hadRecognizer=$hadRecognizer")
        // Invalidated BEFORE cancel()/destroy() so any callback already
        // queued on this thread from the old recognizer is rejected by
        // isCurrent() rather than acting on a session nothing cares about
        // anymore.
        activeSessionId = null
        if (hadRecognizer) {
            lifecycleLog("hardTeardownRecognizer:beforeCancel", null)
            recognizer?.cancel()
            lifecycleLog("hardTeardownRecognizer:beforeDestroy", null)
            recognizer?.destroy()
        }
        recognizer = null
        if (hadRecognizer) lifecycleLog("hardTeardownRecognizer:afterDestroy", null)
    }

    override fun handleOnDestroy() {
        // TEMPORARY DIAGNOSTIC — see pluginInstanceId's own comment above.
        // If this ever fires unexpectedly often/early, it would mean the
        // Activity (and thus this plugin instance) is being recreated more
        // often than assumed — worth cross-checking pluginInstanceId
        // against the very next startSession's own instance id.
        lifecycleLog("handleOnDestroy", activeSessionId)
        activity.runOnUiThread { hardTeardownRecognizer() }
        super.handleOnDestroy()
    }

    private fun sessionEvent(sessionId: String): JSObject = JSObject().apply { put("sessionId", sessionId) }

    private fun resultEvent(sessionId: String, text: String, isFinal: Boolean): JSObject =
        JSObject().apply {
            put("sessionId", sessionId)
            put("text", text)
            put("isFinal", isFinal)
        }

    private fun errorEvent(sessionId: String, code: String, message: String? = null): JSObject =
        JSObject().apply {
            put("sessionId", sessionId)
            put("code", code)
            // TEMPORARY DIAGNOSTIC field — see onError's own comment above.
            // Round-tripped through the spec's own
            // SpeechRecognitionErrorEvent.message field on the JS side;
            // never read by any matching/lifecycle decision.
            if (message != null) put("message", message)
        }

    // TEMPORARY DIAGNOSTIC — see onError's own comment above. Human-readable
    // name for the RAW Android SpeechRecognizer.ERROR_* int, distinct from
    // mapErrorCode's deliberately-lossy Web Speech API vocabulary mapping.
    private fun describeErrorCode(error: Int): String =
        // Int literals rather than SpeechRecognizer.ERROR_* constants for
        // codes 9-15: several were only added in newer SDK levels
        // (ERROR_TOO_MANY_REQUESTS/API 30, ERROR_LANGUAGE_NOT_SUPPORTED &
        // ERROR_LANGUAGE_UNAVAILABLE/API 31, etc.) — literals let this
        // compile and log correctly regardless of compileSdk, and avoid a
        // duplicate-branch clash with ERROR_INSUFFICIENT_PERMISSIONS (9).
        when (error) {
            1 -> "ERROR_NETWORK_TIMEOUT"
            2 -> "ERROR_NETWORK"
            3 -> "ERROR_AUDIO"
            4 -> "ERROR_SERVER"
            5 -> "ERROR_CLIENT"
            6 -> "ERROR_SPEECH_TIMEOUT"
            7 -> "ERROR_NO_MATCH"
            8 -> "ERROR_RECOGNIZER_BUSY"
            9 -> "ERROR_INSUFFICIENT_PERMISSIONS"
            10 -> "ERROR_TOO_MANY_REQUESTS"
            11 -> "ERROR_SERVER_DISCONNECTED"
            12 -> "ERROR_LANGUAGE_NOT_SUPPORTED"
            13 -> "ERROR_LANGUAGE_UNAVAILABLE"
            14 -> "ERROR_CANNOT_CHECK_SUPPORT"
            15 -> "ERROR_CANNOT_LISTEN_TO_DOWNLOAD_EVENTS"
            else -> "UNKNOWN_ERROR"
        }

    private fun bestTranscript(results: Bundle?): String {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        return matches?.firstOrNull() ?: ""
    }

    // Mirrors the Web Speech API's own SpeechRecognitionErrorEvent.error
    // vocabulary (see useVoiceTasbeeh.ts's onerror handler) so the exact
    // same status-mapping logic already validated for the browser path
    // applies unchanged to native errors — no new status branches needed.
    private fun mapErrorCode(error: Int): String =
        when (error) {
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "not-allowed"
            SpeechRecognizer.ERROR_AUDIO -> "audio-capture"
            SpeechRecognizer.ERROR_NO_MATCH -> "no-speech"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-speech"
            SpeechRecognizer.ERROR_NETWORK -> "network"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "network"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "service-not-allowed"
            SpeechRecognizer.ERROR_SERVER -> "service-not-allowed"
            // LIFECYCLE FIX — added 2026-09-19. ERROR_TOO_MANY_REQUESTS
            // (int literal: added API 30, same reasoning as
            // describeErrorCode's own literals above) is the SAME "you're
            // calling this too fast/too often, back off" signal
            // ERROR_RECOGNIZER_BUSY already gets mapped to above — this is
            // the CONFIRMED root cause from real-device logcat (three
            // sessions starting within milliseconds of each other). Mapped
            // the same way for the same reason: useVoiceTasbeeh.ts's
            // "service-not-allowed" branch stops outright with no restart,
            // rather than the generic "error" bucket's restart-up-to-3
            // behavior — retrying immediately is exactly the behavior that
            // caused this in the first place, so it must not auto-retry at
            // all. The doStartSession/doCreateAndStart throttle above is
            // the actual fix (prevents this from recurring); this mapping
            // is the safety net for if it ever still does.
            10 -> "service-not-allowed"
            SpeechRecognizer.ERROR_CLIENT -> "error"
            else -> "error"
        }

    companion object {
        // TEMPORARY DIAGNOSTIC tag — `adb logcat -s DitharVoiceRecog`.
        private const val TAG = "DitharVoiceRecog"
        // LIFECYCLE FIX — see doStartSession's own comment above. The
        // minimum time that must elapse between two
        // createSpeechRecognizer()+startListening() calls. Confirmed
        // real-device logcat showed ERROR_TOO_MANY_REQUESTS after three
        // sessions started within MILLISECONDS of each other; 500ms is a
        // conservative safety margin above that, small enough to be
        // inaudible/unnoticeable against this feature's existing 15s
        // recognizer-health-stall threshold and 60s inactivity timeout.
        private const val MIN_RESTART_INTERVAL_MS = 500L
        private const val DEFAULT_LANGUAGE = "ar-SA"
        private const val EVENT_SESSION_START = "sessionStart"
        private const val EVENT_SPEECH_START = "speechStart"
        private const val EVENT_SPEECH_END = "speechEnd"
        private const val EVENT_RESULT = "result"
        private const val EVENT_ERROR = "error"
        private const val EVENT_SESSION_END = "sessionEnd"
    }
}

