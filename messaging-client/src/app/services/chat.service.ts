import { Injectable } from '@angular/core';
import { WebSocketService } from './web-socket.service';
import { catchError, retry, throwError, tap, Subject, BehaviorSubject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RecipientService } from './client.service';
import { CryptoService } from './crypto.service';
import { PublicChat, sanitizePublicChat } from '../models/public-chat';
import { Client } from '../models/client';
import { ChatData, sanitizeChatData } from '../models/chat-data';
import { UserService } from './user.service';
import { ChatMessage } from '../models/chat-message';
import { AesEncryptedData } from '../models/aes-encrypted-data';
import { MAX_GROUP_CHAT_SIZE } from '../constants';
import { parseJson } from '../helpers/conversion-functions';
import { Chat, sanitizeChat } from '../models/chat';
import { SignedDataService } from './signed-data.service';


@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private messages: ChatMessage[] = []

  private _messagesSubject = new BehaviorSubject<ChatMessage[]>(this.messages);
  public messages$ = this._messagesSubject.asObservable();
 

  constructor(
    private webSocketService: WebSocketService,
    private cryptoService: CryptoService,
    private userService: UserService,
    private signedDataService: SignedDataService
  ) { 
 
    // Listen for incoming messages
    this.webSocketService.messageRecieved$.subscribe((message: any) => {  
      this.processMessage(message);
    });
    
  }

  private async processMessage(message: any){
    if (!message) return;
    
    const data = await this.signedDataService.processSignedData(message);
    if (!data) return;

    if (data.type == "public_chat"){
      this.processPublicChat(data);
    }

    if (data.type == "chat"){
      this.processChat(data);
    }
  }

  // Sanitize public chat message & add to messages
  private processPublicChat(message: any){
    const publicChat = sanitizePublicChat(message);
    if (!publicChat) return;

    this.addMessage(this.publicChatToChatMessage(publicChat))
  }

  
  // TODO: Add group chat limit to readme
  // Note: This client restricts the max group size to limit resources
  // spent on attempting to decrypt symm_keys
  private async processChat(message: any){
    console.log("Processing chat", message)
    const chatData = sanitizeChatData(message);
    if (!chatData) return;
    
    // Decrypt message
    const chat = await this.decryptChat(chatData);
    if (!chat){
      console.log("Could not decrypt chat data")
      return;
    }

    // Add message to chat messages
    this.addMessage(this.chatToChatMessage(chat));
  }

  private async decryptChat(chatData: ChatData): Promise<Chat | null>{
    
    let aesKey = ""
    let decryptedChatString = ""
    let decryptedChat = null
    // Attempt to decrypt message with each encrypted symm_key
    for(let i = 0; i < MAX_GROUP_CHAT_SIZE && i < chatData.symm_keys.length; i++){
      
      // Attempt to decrypt symm key
      try {
        aesKey = await this.cryptoService.decryptRsa(chatData.symm_keys[i])
      } catch (error) {
        continue;
      }

      // Attempt to decrypt message
      try {
        decryptedChatString = await this.cryptoService.decryptAes(aesKey, chatData.iv, chatData.chat);
      } catch (error) {
        continue;
      }
      
      // Attempt to json parse decrypted message
      // The message decrypted using the correct aes key should be a json string
      decryptedChat = parseJson(decryptedChatString)
      
      // If json is successfully parsed - assume the aes key has been successfully decrypted
      if (decryptedChat) {
        return sanitizeChat(decryptedChat);
      };
    }

    return null;
  }

  private chatToChatMessage(c: Chat): ChatMessage{

    return {
      sender: c.participants.at(0) ?? "", // Checked in sanitizeChat
      recipients: c.participants.slice(1),
      isPublic: false,
      message: c.message
    }
  }

  // Adds a message to the messages subject & emits to observers
  private addMessage(message:ChatMessage){

    let newMessages = this._messagesSubject.getValue()
    newMessages.push(message);

    this._messagesSubject.next(newMessages);
  }

  public async sendMessage(message: string, recipients: Client[]){

    // Create chat object
    const chat = this.createChat(message, recipients);

    console.log("Sending chat:", chat)

    // Create chat data
    // Encrypt chat using AES
    const aesRes: AesEncryptedData = await this.cryptoService.encryptAES(JSON.stringify(chat));

    // Add symm_keys & dest server for each participant
    let encryptedAesKeys: string[] = []
    let destServerSet = new Set<string>

    for (const recipient of recipients){
      
      // Encrypt AES key with each recipient's public RSA key
      const encryptedAesKey: string = await this.cryptoService.encryptRsa(recipient.publicKey, aesRes.key);
      encryptedAesKeys.push(encryptedAesKey);
      
      // Add recipient's server to the set of dest servers
      destServerSet.add(recipient.serverAddress);
    }

    const chatData: ChatData = {
      type: "chat",
      destination_servers: Array.from(destServerSet),
      iv: aesRes.iv,
      symm_keys: encryptedAesKeys,
      chat: aesRes.cipherText
    }
    
    // Add to messages array
    this.addMessage({
      sender: this.userService.getUserFingerprint(),
      recipients: recipients.map(r => r.fingerprint),
      message: message,
      isPublic: false
    })

    // Send as signed data
    this.signedDataService.sendAsSignedData(chatData);
  }

  // Creates a chat object given a message and array of recipients
  private createChat(message: string, recipients: Client[]): Chat{
    // Add self as first participant (sender)
    const participants: string[] = []
    participants.push(this.userService.getUserFingerprint());
    
    // Add recipients
    const recipientFingerprints = recipients.map(r => r.fingerprint);
    participants.push(...recipientFingerprints);

    return {
      participants: participants,
      message: message,
    }
  }

  // Sends a public chat message
  public async sendPublicMessage(message: string){
    // Generate sender fingerprint
    const userFingerprint = this.userService.getUserFingerprint();

    // Send as signed_data
    this.signedDataService.sendAsSignedData({
      type: "public_chat",
      sender: userFingerprint,
      message: message
    } as PublicChat)

    // Add message to messages
    const chatMessage: ChatMessage = {
      sender: userFingerprint,
      recipients: [],
      isPublic: true,
      message: message
    }
    this.addMessage(chatMessage);
  }

  private publicChatToChatMessage(publicChat: PublicChat): ChatMessage{

    return {
      sender: publicChat.sender,
      recipients: [],
      isPublic: true,
      message: publicChat.message
    }

  }

}
