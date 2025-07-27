#!/usr/bin/env node

/**
 * Helper script to generate and optionally trust SSL certificates for HTTPS development
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const certDir = join(tmpdir(), 'flatbread-certs');
const keyPath = join(certDir, 'key.pem');
const certPath = join(certDir, 'cert.pem');

function generateCertificate() {
  console.log('🔐 Generating SSL certificate for Flatbread HTTPS...\n');

  // Ensure certificate directory exists
  if (!existsSync(certDir)) {
    mkdirSync(certDir, { recursive: true });
  }

  // Certificate configuration
  const certConfig = {
    keySize: 2048,
    validDays: 365,
    country: 'US',
    state: 'Development',
    city: 'Local',
    organization: 'Flatbread Dev',
    organizationalUnit: 'Development Server',
    commonName: 'localhost',
    subjectAltNames: 'DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1',
  };

  // Create OpenSSL config file
  const configPath = join(certDir, 'openssl.conf');
  const opensslConfig = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C=${certConfig.country}
ST=${certConfig.state}
L=${certConfig.city}
O=${certConfig.organization}
OU=${certConfig.organizationalUnit}
CN=${certConfig.commonName}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = ${certConfig.subjectAltNames}
  `.trim();

  writeFileSync(configPath, opensslConfig);

  try {
    // Generate certificate
    const opensslCommand = [
      'openssl req',
      '-x509',
      `-newkey rsa:${certConfig.keySize}`,
      `-keyout "${keyPath}"`,
      `-out "${certPath}"`,
      '-sha256',
      `-days ${certConfig.validDays}`,
      '-nodes',
      `-config "${configPath}"`,
      '-extensions v3_req',
    ].join(' ');

    execSync(opensslCommand, { stdio: 'pipe' });

    // Clean up config file
    execSync(`rm -f "${configPath}"`);

    console.log('✅ SSL certificate generated successfully!');
    console.log(`📍 Location: ${certDir}`);
    console.log(`⏰ Valid for: ${certConfig.validDays} days`);
    console.log(`🌐 Hosts: localhost, *.localhost, 127.0.0.1, ::1\n`);

    return true;
  } catch (error) {
    console.error('❌ Failed to generate SSL certificate');
    console.error(`Error: ${error.message}`);
    return false;
  }
}

function showTrustInstructions() {
  console.log('🔧 HOW TO TRUST THE CERTIFICATE:\n');

  console.log('📱 CHROME/EDGE:');
  console.log('   1. Navigate to https://localhost:5058/graphql');
  console.log('   2. Click "Advanced" → "Proceed to localhost (unsafe)"');
  console.log('   3. OR: Add to trusted certificates (see below)\n');

  console.log('🦊 FIREFOX:');
  console.log('   1. Navigate to https://localhost:5058/graphql');
  console.log('   2. Click "Advanced" → "Accept the Risk and Continue"\n');

  console.log('🍎 MACOS - Add to Keychain (Permanent Trust):');
  console.log(`   1. open "${certPath}"`);
  console.log('   2. Double-click the certificate in Keychain Access');
  console.log(
    '   3. Expand "Trust" → Set "When using this certificate" to "Always Trust"'
  );
  console.log('   4. Close and enter your password\n');

  console.log('🐧 LINUX - Add to System Trust Store:');
  console.log(
    `   sudo cp "${certPath}" /usr/local/share/ca-certificates/flatbread.crt`
  );
  console.log('   sudo update-ca-certificates\n');

  console.log('🪟 WINDOWS - Add to Trusted Root:');
  console.log('   1. Right-click certificate file → "Install Certificate"');
  console.log(
    '   2. Choose "Local Machine" → "Place all certificates in following store"'
  );
  console.log('   3. Browse → "Trusted Root Certification Authorities" → OK\n');

  console.log('🚀 TESTING:');
  console.log('   • HTTP:  http://localhost:5057/graphql');
  console.log('   • HTTPS: https://localhost:5058/graphql');
  console.log('   • Start server: npx flatbread start -H\n');
}

function main() {
  console.log('🥯 Flatbread HTTPS Certificate Setup\n');

  if (existsSync(certPath)) {
    console.log('🔐 Certificate already exists!');
    console.log(`📍 Location: ${certDir}\n`);
  } else {
    if (!generateCertificate()) {
      process.exit(1);
    }
  }

  showTrustInstructions();
}

main();
