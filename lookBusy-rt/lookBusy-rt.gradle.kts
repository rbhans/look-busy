/*
 * Copyright 2026 QAGraphics. All Rights Reserved.
 */

import com.tridium.gradle.plugins.bajadoc.task.Bajadoc
import com.tridium.gradle.plugins.module.util.ModulePart.RuntimeProfile.*

plugins {
  // The Niagara Module plugin configures the "moduleManifest" extension and the
  // "jar" and "moduleTestJar" tasks.
  id("com.tridium.niagara-module")

  // The signing plugin configures the correct signing of modules. It requires
  // that the plugin also be applied to the root project.
  id("com.tridium.niagara-signing")

  // The bajadoc plugin configures the generation of Bajadoc for a module.
  id("com.tridium.bajadoc")

  // Configures JaCoCo for the "niagaraTest" task of this module.
  id("com.tridium.niagara-jacoco")

  // The Annotation processors plugin adds default dependencies on ":nre"
  // for the "annotationProcessor" and "moduleTestAnnotationProcessor"
  // configurations.
  id("com.tridium.niagara-annotation-processors")

  // The niagara_home repositories convention plugin configures !bin/ext and
  // !modules as flat-file Maven repositories so that projects in this build can
  // depend on already-installed Niagara modules.
  id("com.tridium.convention.niagara-home-repositories")
}

description = "Small games for Px pages and station views"

moduleManifest {
  moduleName.set("lookBusy")
  runtimeProfile.set(rt)
  vendor.set("qag")
  vendorVersion.set("1.0")
  preferredSymbol.set("lbusy")
  bajaVersion.set("4.10")
}

// Same as QAGcharts: drop the dependency versions the build writes (the
// Niagara version it was built against), so the module installs on 4.10+.
tasks.matching { it.name == "writeModuleXml" }.configureEach {
  doLast {
    val moduleXml = layout.buildDirectory.file("manifest/writeModuleXml/module.xml").get().asFile
    if (!moduleXml.isFile) return@doLast

    val original = moduleXml.readText()
    val updated = Regex("(<dependency\\b[^>]*?)\\s+vendorVersion=\"[^\"]*\"")
      .replace(original, "$1")

    if (updated != original) {
      moduleXml.writeText(updated)
    }
  }
}

// See documentation at module://docDeveloper/doc/build.html#dependencies for the supported
// dependency types
dependencies {
  // NRE dependencies
  nre(":nre")

  // Niagara module dependencies
  api(":baja")

  // Test Niagara module dependencies
  moduleTestImplementation(":test-wb")
}

tasks.named<Bajadoc>("bajadoc") {
  includePackage("com.qag.lookBusy")
}
