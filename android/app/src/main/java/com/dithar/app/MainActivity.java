package com.dithar.app;

import android.os.Bundle;
import com.dithar.app.floatingtasbeeh.FloatingTasbeehPlugin;
import com.dithar.app.voicerecognition.VoiceRecognitionPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FloatingTasbeehPlugin.class);
        registerPlugin(VoiceRecognitionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
