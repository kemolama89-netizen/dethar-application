package com.dithar.app;

import android.os.Bundle;
import com.dithar.app.audioadhkar.AudioAdhkarPlugin;
import com.dithar.app.floatingtasbeeh.FloatingTasbeehPlugin;
import com.dithar.app.location.LocationPermissionPlugin;
import com.dithar.app.voicerecognition.VoiceRecognitionPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FloatingTasbeehPlugin.class);
        registerPlugin(VoiceRecognitionPlugin.class);
        registerPlugin(AudioAdhkarPlugin.class);
        registerPlugin(LocationPermissionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
