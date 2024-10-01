import { Injectable } from '@angular/core';
import { sanitizeSignedData, SignedData } from '../models/signed-data';
import { Hello } from '../models/hello';
import { ChatData, sanitizeChatData } from '../models/chat-data';
import { PublicChat } from '../models/public-chat';
import { CryptoService } from './crypto.service';
import { WebSocketService } from './web-socket.service';
import { ChatService } from './chat.service';


// Manages signed data counter
// Validates incoming signed data & notifies signed data listeners

@Injectable({
  providedIn: 'root'
})
export class SignedDataService {

  constructor(
    private cryptoService: CryptoService,
    private webSocketService: WebSocketService
  ) {
  }

  // Validates the signed data & returns the data it contains
  public async processSignedData(message: any){
    console.log("processing signed data")
    // sanitize data
    const signedData = sanitizeSignedData(message);
    if (!signedData) {
      console.log("signed data sanitization failed")
      return null
    };

    // TODO: Validate signature

    // TODO: Validate counter

    return signedData.data
  }
  async sendAsSignedData(data: Hello | ChatData | PublicChat ){

    let message = {} as SignedData;

    message.type = "signed_data"
    message.counter = this.getCounter()
    message.data = data;

    let dataToSign = JSON.stringify(data) + message.counter.toString();

    message.signature = await this.cryptoService.signRsa(dataToSign);
    
    this.webSocketService.send(message);
  }

  private getCounter(): number{
    
    if (localStorage.getItem("counter") === null){
      localStorage.setItem("counter", "0");
      return 0;
    }

    // Return as a number
    return parseInt(localStorage.getItem("counter") ?? "0");
  }


  private incrementCounter(){
    let counter = parseInt(localStorage.getItem("counter") ?? "0");
    counter++
    localStorage.setItem("counter", counter.toString());
  }
}
