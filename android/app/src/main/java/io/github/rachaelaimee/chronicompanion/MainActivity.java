package io.github.rachaelaimee.chronicompanion;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Required to allow Supabase to catch the redirect
        this.getBridge().getWebView().post(() -> {
            getBridge().handleAppUrlOpen(getIntent());
        });
    }
}
