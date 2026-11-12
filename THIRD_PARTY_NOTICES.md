# Third party notices

Activity Lab's own source is licensed under the MIT License in `LICENSE`.

The IntelliJ distribution includes these unchanged libraries:

| Component | Version | License | Project |
| :--- | :--- | :--- | :--- |
| Gson | 2.11.0 | Apache License 2.0 | https://github.com/google/gson |
| Error Prone annotations | 2.27.0 | Apache License 2.0 | https://github.com/google/error-prone |

The source repository also includes the Gradle 9.0.0 wrapper, licensed under the Apache License 2.0. Its scripts retain the original copyright and license headers. The wrapper downloads Gradle when you build the plugin.

The Apache license text is in `licenses/Apache-2.0.txt` and is included in the Activity Lab plugin JAR under `META-INF/THIRD_PARTY_LICENSES/`. The original library metadata is preserved in each dependency JAR.

IntelliJ IDEA, the JDK, and test dependencies are development tools and are not included in the plugin installer or release kit. They retain their own licenses.
