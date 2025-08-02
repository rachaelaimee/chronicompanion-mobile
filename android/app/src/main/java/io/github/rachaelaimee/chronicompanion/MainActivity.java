package io.github.rachaelaimee.chronicompanion;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // REMOVED: Firebase Authentication plugin registration
        // We're using Firebase Web SDK directly to avoid conflicts
    }
}
