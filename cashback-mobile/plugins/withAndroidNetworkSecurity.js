const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">72.62.195.21</domain>
  </domain-config>
</network-security-config>
`;

module.exports = function withAndroidNetworkSecurity(config) {
  config = AndroidConfig.Permissions.withPermissions(config, ["android.permission.INTERNET"]);

  config = withAndroidManifest(config, config => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    mainApplication.$["android:usesCleartextTraffic"] = "true";
    mainApplication.$["android:networkSecurityConfig"] = "@xml/network_security_config";

    return config;
  });

  return withDangerousMod(config, [
    "android",
    config => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml");
      const xmlPath = path.join(xmlDir, "network_security_config.xml");

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(xmlPath, NETWORK_SECURITY_XML);

      return config;
    },
  ]);
};
