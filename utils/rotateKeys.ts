import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Utility to rotate JWT signing keys
 * This will generate new RSA key pairs and replace the existing ones
 * All existing tokens will be invalidated as they were signed with the old keys
 * 
 * Usage: 
 * - Run this script directly: `ts-node rotateKeys.ts`
 * - Or import and call the function: `import { rotateJwtKeys } from './utils/rotateKeys'; rotateJwtKeys();`
 */
export function rotateJwtKeys() {
  try {
    console.log('Starting JWT key rotation...');
    
    // Get key paths from environment variables
    const accessPrivateKeyPath = process.env.JWT_ACCESS_PRIVATE_KEY_PATH;
    const accessPublicKeyPath = process.env.JWT_ACCESS_PUBLIC_KEY_PATH;
    const refreshPrivateKeyPath = process.env.JWT_REFRESH_PRIVATE_KEY_PATH;
    const refreshPublicKeyPath = process.env.JWT_REFRESH_PUBLIC_KEY_PATH;
    
    if (!accessPrivateKeyPath || !accessPublicKeyPath || !refreshPrivateKeyPath || !refreshPublicKeyPath) {
      throw new Error('JWT key paths not properly configured in environment variables');
    }
    
    // Backup existing keys
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(path.dirname(accessPrivateKeyPath), 'backup', timestamp);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Backup access keys if they exist
    if (fs.existsSync(accessPrivateKeyPath)) {
      fs.copyFileSync(
        accessPrivateKeyPath, 
        path.join(backupDir, path.basename(accessPrivateKeyPath))
      );
    }
    
    if (fs.existsSync(accessPublicKeyPath)) {
      fs.copyFileSync(
        accessPublicKeyPath, 
        path.join(backupDir, path.basename(accessPublicKeyPath))
      );
    }
    
    // Backup refresh keys if they exist
    if (fs.existsSync(refreshPrivateKeyPath)) {
      fs.copyFileSync(
        refreshPrivateKeyPath, 
        path.join(backupDir, path.basename(refreshPrivateKeyPath))
      );
    }
    
    if (fs.existsSync(refreshPublicKeyPath)) {
      fs.copyFileSync(
        refreshPublicKeyPath, 
        path.join(backupDir, path.basename(refreshPublicKeyPath))
      );
    }
    
    console.log(`Existing keys backed up to ${backupDir}`);
    
    // Generate new access key pair
    console.log('Generating new access key pair...');
    execSync(`openssl genrsa -out "${accessPrivateKeyPath}" 2048`);
    execSync(`openssl rsa -in "${accessPrivateKeyPath}" -pubout -out "${accessPublicKeyPath}"`);
    
    // Generate new refresh key pair
    console.log('Generating new refresh key pair...');
    execSync(`openssl genrsa -out "${refreshPrivateKeyPath}" 2048`);
    execSync(`openssl rsa -in "${refreshPrivateKeyPath}" -pubout -out "${refreshPublicKeyPath}"`);
    
    console.log('JWT key rotation completed successfully');
    console.log('All existing tokens are now invalidated');
    
    return true;
  } catch (error) {
    console.error('Error rotating JWT keys:', error);
    return false;
  }
}

// If this script is run directly, execute the rotation
if (require.main === module) {
  rotateJwtKeys();
}