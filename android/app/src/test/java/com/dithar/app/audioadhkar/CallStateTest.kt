package com.dithar.app.audioadhkar

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** The Settings volume preview («تجربة الصوت») never plays while the phone rings or is in a call. */
class CallStateTest {
    @Test
    fun ringingAndEveryKindOfCallCount() {
        // AudioManager.MODE_RINGTONE, MODE_IN_CALL, MODE_IN_COMMUNICATION, MODE_CALL_SCREENING, MODE_CALL_REDIRECT, MODE_COMMUNICATION_REDIRECT.
        for (mode in 1..6) assertTrue("mode $mode", CallState.isCall(mode))
    }

    @Test
    fun normalAndUnknownModesDoNot() {
        assertFalse(CallState.isCall(0))  // MODE_NORMAL
        assertFalse(CallState.isCall(-1)) // MODE_CURRENT / MODE_INVALID
        assertFalse(CallState.isCall(-2))
    }
}
