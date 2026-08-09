# Add project specific ProGuard rules here.
# For more details, see http://developer.android.com/guide/developing/tools/proguard.html

# ─── Debugging ────────────────────────────────────────────────────────────────
# Preserve line numbers in stack traces for easier debugging of release crashes.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ─── Capacitor Bridge ─────────────────────────────────────────────────────────
# Capacitor uses reflection to load plugins — these must not be renamed/removed.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}

# ─── Capawesome Foreground Service Plugin ─────────────────────────────────────
-keep class io.capawesome.capacitorjs.plugins.foregroundservice.** { *; }

# ─── Firebase Cloud Messaging ─────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ─── AndroidX / WebView ───────────────────────────────────────────────────────
-keep class androidx.webkit.** { *; }
-keep class android.webkit.** { *; }

# ─── Keep JS interface class members (Capacitor WebView bridge) ───────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
