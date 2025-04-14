package com.travelquest.app;

import android.app.Application;
import android.content.res.Configuration;
import androidx.annotation.NonNull;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactHost;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.react.flipper.ReactNativeFlipper;
import com.facebook.soloader.SoLoader;

import expo.modules.ApplicationLifecycleDispatcher;
import expo.modules.ReactNativeHostWrapper;

import com.reactnativecommunity.webview.RNCWebViewPackage;

import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
    new ReactNativeHostWrapper(this, new DefaultReactNativeHost(this) {
      @Override
      public boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
      }

      @Override
      protected List<ReactPackage> getPackages() {
        @SuppressWarnings("UnnecessaryLocalVariable")
        List<ReactPackage> packages = new PackageList(this).getPackages();
        // Packages that cannot be autolinked yet can be added manually here, for example:
        // packages.add(new MyReactNativePackage());
        // El paquete de WebView ya debería estar incluido automáticamente por PackageList
        // Si aún tienes problemas, puedes descomenta la siguiente línea:
        packages.add(new RNCWebViewPackage());
        return packages;
      }

      @Override
      protected String getJSMainModuleName() {
        return ".expo/.virtual-metro-entry";
      }

      @Override
      protected boolean isNewArchEnabled() {
        return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
      }

      @Override
      protected Boolean isHermesEnabled() {
        return BuildConfig.IS_HERMES_ENABLED;
      }
  });

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    if (!BuildConfig.REACT_NATIVE_UNSTABLE_USE_RUNTIME_SCHEDULER_ALWAYS) {
      ReactFeatureFlags.unstable_useRuntimeSchedulerAlways = false;
    }
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
    }
    if (BuildConfig.DEBUG) {
      ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    }
    
    // Configurar WebView para mejor rendimiento con Cesium
    configureWebView();
    
    ApplicationLifecycleDispatcher.onApplicationCreate(this);
  }

  @Override
  public void onConfigurationChanged(@NonNull Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);
  }

  // Método para mejorar la configuración de WebView para Cesium
  private void configureWebView() {
    try {
      android.webkit.WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
      
      // Configuración general para todas las WebViews
      android.webkit.WebView webView = new android.webkit.WebView(this);
      webView.getSettings().setJavaScriptEnabled(true);
      webView.getSettings().setDomStorageEnabled(true);
      webView.getSettings().setAllowFileAccess(true);
      webView.getSettings().setAllowContentAccess(true);
      webView.getSettings().setAllowFileAccessFromFileURLs(true);
      webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
      webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
      webView.getSettings().setLoadWithOverviewMode(true);
      webView.getSettings().setUseWideViewPort(true);
      webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
      
      // Configuraciones para mejorar rendimiento de WebGL
      webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
      
      // Métodos obsoletos que ya no son necesarios en versiones modernas de Android
      if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.TIRAMISU) {
        try {
          // Estos métodos están obsoletos y no disponibles en API 33+
          webView.getSettings().setGeolocationEnabled(true);
        } catch (Exception e) {
          android.util.Log.w("TravelQuest", "Error configurando métodos antiguos de WebView", e);
        }
      }
      
      // Solución para dispositivos con Android 9+
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
        webView.getSettings().setSafeBrowsingEnabled(false);
      }
      
      // Activar aceleración por hardware
      webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
      
      // Destruir la instancia temporal
      webView.destroy();
    } catch (Exception e) {
      android.util.Log.e("TravelQuest", "Error configurando WebView", e);
    }
  }
}
