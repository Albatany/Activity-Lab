import org.jetbrains.intellij.platform.gradle.TestFrameworkType
import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType

plugins {
    java
    id("org.jetbrains.intellij.platform") version "2.19.0"
}

group = "dev.albatany.activitylab"
version = "6.1.0"

repositories {
    mavenCentral()
    intellijPlatform { defaultRepositories() }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.3.6")
        pluginVerifier()
        testFramework(TestFrameworkType.Platform)
    }
    implementation("com.google.code.gson:gson:2.11.0")
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    // The platform's JUnit 5 environment initializer also uses JUnit 4 rules.
    testImplementation("junit:junit:4.13.2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    testRuntimeOnly("org.junit.vintage:junit-vintage-engine:5.11.4")
}

java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

intellijPlatform {
    buildSearchableOptions = false
    // Swing UI is defined in Java; there are no .form files to instrument.
    instrumentCode = false
    pluginConfiguration {
        id = "dev.albatany.activitylab"
        name = "Activity Lab"
        version = project.version.toString()
        ideaVersion { sinceBuild = "243" }
        vendor { name = "Albatany"; url = "https://github.com/Albatany/Activity-Lab" }
    }
    pluginVerification {
        ides {
            current()
            providers.gradleProperty("verifyIdeaVersion").orNull?.let { create(IntelliJPlatformType.IntellijIdea, it) }
            if (providers.gradleProperty("verifyRecommended").isPresent) recommended()
        }
    }
}

tasks.test { useJUnitPlatform() }
tasks.processResources { from("../LICENSE") { into("META-INF") } }
tasks.processResources {
    inputs.property("pluginVersion", project.version.toString())
    filesMatching("META-INF/activity-lab-version.properties") { expand("version" to project.version.toString()) }
    from("../THIRD_PARTY_NOTICES.md") { into("META-INF") }
    from("../licenses") { into("META-INF/THIRD_PARTY_LICENSES") }
}
tasks.withType<JavaCompile>().configureEach { options.encoding = "UTF-8" }
tasks.withType<AbstractArchiveTask>().configureEach {
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
}

// Verifier 1.411 creates report files exclusively; repeating the same version
// otherwise fails on an old report even when the plugin is compatible.
val cleanVerificationReports by tasks.registering(Delete::class) {
    delete(layout.buildDirectory.dir("reports/pluginVerifier"))
}
tasks.named("verifyPlugin") { dependsOn(cleanVerificationReports) }
