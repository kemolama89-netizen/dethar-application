package com.dithar.app;

import android.os.Bundle;
import com.dithar.app.audioadhkar.AudioAdhkarPlugin;
import com.dithar.app.audioadhkar.AudioAdhkarTrace;
import com.dithar.app.floatingtasbeeh.FloatingTasbeehPlugin;
import com.dithar.app.journey.QuranJourneyPlugin;
import com.dithar.app.location.LocationPermissionPlugin;
import com.dithar.app.orientation.OrientationPlugin;
import com.dithar.app.prayernotifications.AdhanDownloadsPlugin;
import com.dithar.app.prayernotifications.PrayerNotificationsPlugin;
import com.dithar.app.reminders.RemindersPlugin;
import com.dithar.app.screen.ScreenAwakePlugin;
import com.dithar.app.share.SharePlugin;
import com.dithar.app.voicerecognition.VoiceRecognitionPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FloatingTasbeehPlugin.class);
        registerPlugin(VoiceRecognitionPlugin.class);
        registerPlugin(AudioAdhkarPlugin.class);
        registerPlugin(LocationPermissionPlugin.class);
        registerPlugin(PrayerNotificationsPlugin.class);
        registerPlugin(AdhanDownloadsPlugin.class);
        registerPlugin(RemindersPlugin.class);
        registerPlugin(SharePlugin.class);
        registerPlugin(OrientationPlugin.class);
        registerPlugin(ScreenAwakePlugin.class);
        registerPlugin(QuranJourneyPlugin.class);
        super.onCreate(savedInstanceState);
        trace("onCreate");
    }

    // Diagnostics only (AudioAdhkarTrace): when the UI went to the background,
    // was exited (finishing) or recreated, next to what the playback did.
    @Override
    public void onResume() {
        super.onResume();
        trace("onResume");
    }

    @Override
    public void onPause() {
        super.onPause();
        trace("onPause");
    }

    @Override
    public void onStop() {
        super.onStop();
        trace("onStop");
    }

    @Override
    public void onDestroy() {
        trace("onDestroy finishing=" + isFinishing() + " configChange=" + isChangingConfigurations());
        super.onDestroy();
    }

    private void trace(String event) {
        AudioAdhkarTrace.log(this, "activity", event + " importance=" + AudioAdhkarTrace.importance());
    }
}
