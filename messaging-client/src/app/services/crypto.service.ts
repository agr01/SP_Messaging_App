import { Injectable } from '@angular/core';
import {Buffer} from 'buffer';
import { BehaviorSubject } from 'rxjs';
import { AesEncryptedData } from '../models/aes-encrypted-data';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  private RsaPssKeyPair: CryptoKeyPair | undefined
  private RsaOaepKeyPair: CryptoKeyPair | undefined
  
  // Emits when RSA keys are generated
  // Used to send server hello only when both the keys are generated and the connection is open
  private rsaKeysGenerated = new BehaviorSubject<boolean>(false); 
  public rsaKeysGenerated$ = this.rsaKeysGenerated.asObservable();
  
  constructor() { }

  // Generate RSA Keys
  public async generateRsaKeys(): Promise<void> {

    const randomValues = new Uint8Array(16);
    window.crypto.getRandomValues(randomValues);
    console.log("random values: ", randomValues);
    
    // Generate PSS Keys
    this.RsaPssKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    );

    var pssPublicKey = await window.crypto.subtle.exportKey("spki", this.RsaPssKeyPair.publicKey);
    var pssPrivateKey = await window.crypto.subtle.exportKey("pkcs8", this.RsaPssKeyPair.privateKey);

    // Duplicate to generate OAEP Keys
    let rsaOaepPublicKey = await window.crypto.subtle.importKey(
      "spki",
      pssPublicKey,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      true,
      ['encrypt']
    );

    let rsaOaepPrivateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      pssPrivateKey,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      true,
      ['decrypt']
    );
    
    this.RsaOaepKeyPair = {privateKey: rsaOaepPrivateKey, publicKey: rsaOaepPublicKey}
    
    // TODO: Remove
    console.log(`generated keys`)

    this.rsaKeysGenerated.next(true);
  }

  // Encrypt data using RSA public key
  // Returns base64 encoded ciphertext
  public async encryptRsa(publicKeyPem: string, data: string): Promise<string> {
    
    const publicKey = await this.pemToCryptoKey(publicKeyPem);

    const uint8Message = new TextEncoder().encode(data);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      uint8Message
    );
    
    return Buffer.from(encrypted).toString('base64');
  }

  // Signs the data using the user's private RSA key
  // Returns a base64 encoded signature
  public async signRsa(data: string): Promise<string>{
    
    if (!this.RsaPssKeyPair?.privateKey) throw new Error("Could not sign message");

    try {
      // sign hash using RSA-PSS
      const uint8Message = new TextEncoder().encode(data);
      
      const signature = await window.crypto.subtle.sign(
        { 
          name: "RSA-PSS",
          saltLength: 32
        },
        this.RsaPssKeyPair.privateKey,
        uint8Message
      );

      return Buffer.from(signature).toString('base64');

    } catch (error){
      console.error("Error signing data: ", error)
      throw error;
    }
    
  }
  
  // Decrypt message using RSA private key
  public async decryptRsa(encryptedMessage: string): Promise<string> {

    if (!this.RsaOaepKeyPair) throw new Error("Could not encrypt message");

    const decodedMessage = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      this.RsaOaepKeyPair.privateKey,
      decodedMessage
    );

    return new TextDecoder().decode(decrypted);
  }

    
  // Encrypts plaintext using a generated AES key
  // Returns iv and ciphertext
  // Source: https://medium.com/@tony.infisical/guide-to-web-crypto-api-for-encryption-decryption-1a2c698ebc25
  public async encryptAES(plainText:string): Promise<AesEncryptedData> {

    // encode the text you want to encrypt
    const encodedText = new TextEncoder().encode(plainText);

    // Create a random 16-byte initialization vector 
    const iv = window.crypto.getRandomValues(new Uint8Array(16));

    let key = undefined

    try {
      // Generate a random 32-byte key
      key = await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 128 // 16 bytes
        },
        true,
        ["encrypt"]
      );
      
    } catch (error) {
      console.error("Error generating aes key", error)
      throw error
    }
     
    // Encrypt the data
    let ciphertextBuff = undefined;

    try {
      ciphertextBuff = await window.crypto.subtle.encrypt(
          {
              name: "AES-GCM",
              iv: iv,
              tagLength: 128 // 16 bytes for authentication tag
          },
          key,
          encodedText
      );
    } catch (error) {
      console.error("Error encrypting data with aes key", error)
      throw error
    }
    

    // Export the key
    let keyBuffer
    try {
      keyBuffer = await window.crypto.subtle.exportKey("raw", key)
    } catch (error) {
      console.error("Error exporting aes key", error)
      throw error
    }
    
    // Return the base64 IV and ciphertext
    return {
      key: Buffer.from(keyBuffer).toString('base64'),
      iv: Buffer.from(iv).toString('base64'), 
      cipherText: Buffer.from(ciphertextBuff).toString('base64')
    };
      
  }

  // Returns the user's public key in PEM format
  public async generateUserPublicKeyPem(): Promise<string>{

    if (!this.RsaPssKeyPair) throw new Error("Could not get public key");

    // Export the public key to SPKI format
    const publicKey = await window.crypto.subtle.exportKey(
      "spki",  
      this.RsaPssKeyPair.publicKey
    );

    // Convert the SPKI ArrayBuffer to a Base64 string
    const base64Key = Buffer.from(publicKey).toString('base64');

    return await this.addPemHeaders(base64Key);
  }

  // Ensures that incoming pem keys contain no whitespace between the headers
  public standardisePem(key: string): string{

    // Remove pem headers and all whitespace
    key = this.pemToBase64key(key);
    // Adds pem headers back
    key = this.addPemHeaders(key);

    return key;
  }

  // Adds PEM headders to a base64 key
  private addPemHeaders(base64key: string): string {

    let pem = "-----BEGIN PUBLIC KEY-----\n";
    pem += base64key; 
    pem += "\n-----END PUBLIC KEY-----";

    return pem;
  }

  // Removes pem headers and all whitespace leaving only the base64 key
  private pemToBase64key(pem: string): string{
    return pem.replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/[\r\n]+/g, '');
  }

  
  private async pemToCryptoKey(pem: string) {
    
    // Remove the PEM header, footer & whitespace
    const pemFormatted = this.pemToBase64key(pem)
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

  public async getFingerprint(publicKeyPem: string): Promise<string>{ 
    const data: Uint8Array = new TextEncoder().encode(publicKeyPem);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);

    return Buffer.from(hashBuffer).toString('base64')
  }

  public async generateUserFingerprint(): Promise<string>{
    const userPublicKey = await this.generateUserPublicKeyPem();
    return await this.getFingerprint(userPublicKey);
  }

}
