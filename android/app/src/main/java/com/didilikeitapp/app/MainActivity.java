package com.didilikeitapp.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        // Instead of letting Android exit the app, fire a JS event
        // that our popstate-based handler in App.jsx can catch.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "(function(){ window.history.pushState({},''); window.dispatchEvent(new PopStateEvent('popstate',{state:{dili:'back'}})); })()",
                null
            );
        }
        // Do NOT call super.onBackPressed() — that would exit the app
    }
}
