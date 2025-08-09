package com.rachaelaimee.chronicompanion;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Credential Manager uses standard Capacitor plugins (App plugin)
        // No additional plugin registration needed
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Handle deep link intents when app is already running
        setIntent(intent);
    }
}