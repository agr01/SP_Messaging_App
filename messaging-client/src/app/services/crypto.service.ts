import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  keyPair: CryptoKeyPair | undefined
  
  constructor() { }

  // Generate RSA Keys
  async generateRsaKeys(): Promise<void> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    // TODO: Remove
    console.log(`generated keys`)
  }

    // Encrypt message using RSA public key
    async encryptRsa(publicKeyPem: string, message: string): Promise<string> {
      
      const publicKey = await this.pemToCryptoKey(publicKeyPem);

      const uint8Message = new TextEncoder().encode(message);
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        uint8Message
      );
      
      return window.btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    }
  
    // Decrypt message using RSA private key
    async decryptRsa(encryptedMessage: string): Promise<string> {

      if (!this.keyPair) throw new Error("Could not encrypt message");

      const decodedMessage = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        this.keyPair.privateKey,
        decodedMessage
      );
      return new TextDecoder().decode(decrypted);
    }

    async pemToCryptoKey(pem: string) {
      
      // Remove the PEM header, footer & whitespace
      const pemFormatted = pem.replace(/-----BEGIN PUBLIC KEY-----/g, '')
                               .replace(/-----END PUBLIC KEY-----/g, '')
                               .replace(/\s+/g, ''); 

      // Decode the Base64 string to a byte array
      // Source: https://www.geeksforgeeks.org/convert-base64-string-to-arraybuffer-in-javascript/
      const binaryString = window.atob(pemFormatted);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    
      // Import the key
      const cryptoKey = await window.crypto.subtle.importKey(
        'spki', // Format
        bytes.buffer, // The key in ArrayBuffer format
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256' // The hash function
        },
        true, // Extractable
        ['encrypt'] // Key usage
      );
    
      return cryptoKey;
    }
}
