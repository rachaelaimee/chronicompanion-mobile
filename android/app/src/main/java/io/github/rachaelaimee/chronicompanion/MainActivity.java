package io.github.rachaelaimee.chronicompanion;

import com.getcapacitor.BridgeActivity;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register Firebase Authentication plugin
        registerPlugin(FirebaseAuthenticationPlugin.class);
    }
}
