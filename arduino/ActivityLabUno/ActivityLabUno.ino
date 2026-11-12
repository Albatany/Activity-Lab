/*
 * Activity Lab Arduino Uno Companion
 * Safe hardware check using only the built-in LED.
 * © Albatany 2026
 */

constexpr unsigned long BLINK_INTERVAL_MS = 1000;
unsigned long lastToggleAt = 0;
bool ledIsOn = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("Activity Lab Standalone - Arduino Uno hardware check"));
}

void loop() {
  const unsigned long now = millis();
  if (now - lastToggleAt >= BLINK_INTERVAL_MS) {
    lastToggleAt = now;
    ledIsOn = !ledIsOn;
    digitalWrite(LED_BUILTIN, ledIsOn ? HIGH : LOW);
    Serial.println(ledIsOn ? F("LED ON") : F("LED OFF"));
  }
}
