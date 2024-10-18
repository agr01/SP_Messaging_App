// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)
import { Injectable } from '@angular/core';
import {Buffer} from 'buffer';
import { BehaviorSubject } from 'rxjs';
import { AesEncryptedData } from '../models/aes-encrypted-data';
import { SignedData } from '../models/signed-data';
import { Hello } from '../models/hello';
import { ChatData } from '../models/chat-data';
import { PublicChat } from '../models/public-chat';

const AES_ALG = "AES-GCM"
const AES_KEY_LENGTH_BITS = 128
const AES_AUTH_TAG_BITS = 128

const RSA_SIZE_BITS = 2048

const RSA_ENCRYPT_ALG = "RSA-OAEP"
const RSA_ENCRYPT_EXPONENT = new Uint8Array([0x01, 0x00, 0x01]); // 65537
const RSA_ENCRYPT_HASH = "SHA-256" 

const RSA_SIGN_ALG = "RSA-PSS"
const RSA_SIGN_SALT_LENGTH_BYTES = 32
const RSA_SIGN_HASH = "SHA-256"

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  private _rsaPssKeyPair: CryptoKeyPair | undefined
  private _rsaOaepKeyPair: CryptoKeyPair | undefined

  private _userCounter = 0;
  
  // Emits when RSA keys are generated
  // Used to send server hello only when both the keys are generated and the connection is open
  private rsaKeysGenerated = new BehaviorSubject<boolean>(false); 
  public rsaKeysGenerated$ = this.rsaKeysGenerated.asObservable();
  
  constructor() { }

  // Generate RSA Keys
  public async generateRsaKeys(): Promise<void> {
    
    // Generate PSS Keys
    this._rsaPssKeyPair = await window.crypto.subtle.generateKey(
      {
        name: RSA_SIGN_ALG,
        modulusLength: RSA_SIZE_BITS,
        publicExponent: RSA_ENCRYPT_EXPONENT, // 65537
        hash: RSA_SIGN_HASH,
      },
      true,
      ['sign', 'verify']
    );

    var pssPublicKey = await window.crypto.subtle.exportKey("spki", this._rsaPssKeyPair.publicKey);
    var pssPrivateKey = await window.crypto.subtle.exportKey("pkcs8", this._rsaPssKeyPair.privateKey);

    // Duplicate to generate OAEP Keys
    let rsaOaepPublicKey = await window.crypto.subtle.importKey(
      "spki",
      pssPublicKey,
      {
        name: RSA_ENCRYPT_ALG,
        hash: RSA_ENCRYPT_HASH
      },
      true,
      ['encrypt']
    );

    let rsaOaepPrivateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      pssPrivateKey,
      {
        name: RSA_ENCRYPT_ALG,
        hash: RSA_ENCRYPT_HASH
      },
      true,
      ['decrypt']
    );
    
    this._rsaOaepKeyPair = {privateKey: rsaOaepPrivateKey, publicKey: rsaOaepPublicKey}

    this.rsaKeysGenerated.next(true);
  }

  // Encrypt data using RSA public key
  // Returns base64 encoded ciphertext
  public async encryptRsa(publicKeyPem: string, data: string): Promise<string> {
    
    const publicKey = await this.pemToEncryptCryptoKey(publicKeyPem);

    const uint8Message = new TextEncoder().encode(data);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: RSA_ENCRYPT_ALG },
      publicKey,
      uint8Message
    );
    
    return Buffer.from(encrypted).toString('base64');
  }

  // Signs the data using the user's private RSA key
  // Returns a base64 encoded signature
  public async signRsa(data: string): Promise<string>{
    
    if (!this._rsaPssKeyPair?.privateKey) throw new Error("Could not sign message");

    try {
      // sign hash using RSA-PSS
      const uint8Message = new TextEncoder().encode(data);
      
      const signature = await window.crypto.subtle.sign(
        { 
          name: RSA_SIGN_ALG,
          saltLength: RSA_SIGN_SALT_LENGTH_BYTES
        },
        this._rsaPssKeyPair.privateKey,
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

    if (!this._rsaOaepKeyPair) throw new Error("Could not encrypt message");

    const decodedMessage = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt(
      { name: RSA_ENCRYPT_ALG },
      this._rsaOaepKeyPair.privateKey,
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
            name: AES_ALG,
            length: AES_KEY_LENGTH_BITS
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
              name: AES_ALG,
              iv: iv,
              tagLength: AES_AUTH_TAG_BITS
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

  public async decryptAes(base64Key: string, base64iv: string, base64CipherText: string): Promise<string>{
    
    try {
      const ivBuffer = this.base64toUint8Array(base64iv);
      const cipherTextBuffer = this.base64toUint8Array(base64CipherText);

      const key = await this.base64AesToCryptoKey(base64Key);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: AES_ALG,
          iv: ivBuffer,
          tagLength: AES_AUTH_TAG_BITS
        },
        key,
        cipherTextBuffer
      );

      return new TextDecoder().decode(decryptedBuffer);
      
    } catch (error) {
      console.error("Error decrypting aes key", error)
      throw error
    }
    
  }

  private async base64AesToCryptoKey(base64Key: string): Promise<CryptoKey>{
    
    try {
      const keyBuffer = this.base64toUint8Array(base64Key).buffer;

      return await window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: AES_ALG },
        false,
        ["decrypt"]
      );
      
    } catch (error) {
      console.error("Failed to convert aes to crypto key");
      throw error
    }
    
  }

  // Returns the user's public key in PEM format
  public async generateUserPublicKeyPem(): Promise<string>{

    if (!this._rsaPssKeyPair) throw new Error("Could not get public key");

    // Export the public key to SPKI format
    const publicKey = await window.crypto.subtle.exportKey(
      "spki",  
      this._rsaPssKeyPair.publicKey
    );

    // Convert the SPKI ArrayBuffer to a Base64 string
    const base64Key = Buffer.from(publicKey).toString('base64');

    return await this.addPemHeaders(base64Key);
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
            .replace(/[\r\n]+/g, '')
            .replace(/\s+/g, '');
  }

  private async pemToEncryptCryptoKey(pem: string) {
    
    try {
      // Remove the PEM header, footer & whitespace
      const pemFormatted = this.pemToBase64key(pem); 

      // Convert base64 key to array buffer
      const keyBuffer = this.base64toUint8Array(pemFormatted).buffer
    
      // Import key
      const cryptoKey = await window.crypto.subtle.importKey(
        'spki', 
        keyBuffer, 
        {
          name: RSA_ENCRYPT_ALG,
          hash: RSA_ENCRYPT_HASH
        },
        true, 
        ['encrypt']
      );
    
      return cryptoKey;
      
    } catch (error) {
      console.error("Error converting pem encryption to crypto key");
      throw error;
    }
    
  }
  
  private async pemToVerifyCryptoKey(pem: string) {
    
    try {
      // Remove the PEM header, footer & whitespace
      const pemFormatted = this.pemToBase64key(pem); 

      // Convert base64 key to array buffer
      const keyBuffer = this.base64toUint8Array(pemFormatted).buffer
    
      // Import key
      const cryptoKey = await window.crypto.subtle.importKey(
        'spki', 
        keyBuffer, 
        {
          name: RSA_SIGN_ALG,
          hash: RSA_SIGN_HASH
        },
        true, 
        ['verify']
      );
    
      return cryptoKey;
      
    } catch (error) {
      console.error("Error converting pem to verification crypto key");
      throw error;
    }
    
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

  // Decode the Base64 string to a byte array
  // Source: https://www.geeksforgeeks.org/convert-base64-string-to-arraybuffer-in-javascript/
  public base64toUint8Array(base64string: string): Uint8Array{
    const binaryString = window.atob(base64string);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes
  }

  public async validateSignature(publicKeyPem: string, data: string, base64signature: string): Promise<boolean>{

    const uint8data = new TextEncoder().encode(data);
    const uint8signature = this.base64toUint8Array(base64signature);

    try {
      const key = await this.pemToVerifyCryptoKey(publicKeyPem);

      return await window.crypto.subtle.verify(
        {
            name: RSA_SIGN_ALG,
            saltLength: RSA_SIGN_SALT_LENGTH_BYTES,
            hash: RSA_SIGN_HASH,
        },
        key,
        uint8signature,
        uint8data
    );
      
    } catch (error) {
      console.error("Error validating signature:", error)
      throw error;
    }

    return true;
  }

  public async signData(data: Hello | ChatData | PublicChat ): Promise<any>{
    
    try {
      if (this._userCounter >= Number.MAX_SAFE_INTEGER){
        throw Error("Cannot sign message. User counter too large.")
      }
  
      const encodedData = JSON.stringify(data);
  
      const dataToSign = encodedData + this._userCounter.toString();
  
      const signature = await this.signRsa(dataToSign);

      const signedData = {
        type: "signed_data",
        counter: this._userCounter,
        data: encodedData,
        signature: signature
      }
      
      this._userCounter++;
  
      return signedData;
      
    } catch (error) {
      console.error("Error signing message", error);
      throw error
    }
    
  }
}
