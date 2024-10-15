import { Injectable } from '@angular/core';
import { sanitizeSignedData, SignedData } from '../models/signed-data';
import { Hello } from '../models/hello';
import { ChatData, sanitizeChatData } from '../models/chat-data';
import { PublicChat } from '../models/public-chat';
import { CryptoService } from './crypto.service';
import { WebSocketService } from './web-socket.service';
import { ChatService } from './chat.service';
import { RecipientService } from './recipient.service';


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


  async sendAsSignedData(data: Hello | ChatData | PublicChat ){

    let message = {} as SignedData;

    message.type = "signed_data"
    message.counter = this.getUsersCounter()
    message.data = data;

    const dataToSign = JSON.stringify(data) + message.counter.toString();

    message.signature = await this.cryptoService.signRsa(dataToSign);
    
    this.webSocketService.send(message);
    
    this.incrementUsersCounter();
  }

  // Return's the user's counter from localstorage
  private getUsersCounter(): number{
    
    if (localStorage.getItem("counter") === null){
      localStorage.setItem("counter", "0");
      return 0;
    }

    // Return as a number
    return parseInt(localStorage.getItem("counter") ?? "0");
  }

  // Incrememnts the user's counter in local storage
  private incrementUsersCounter(){
    let counter = parseInt(localStorage.getItem("counter") ?? "0");
    
    if (counter < Number.MAX_SAFE_INTEGER)
      counter++
    
    localStorage.setItem("counter", counter.toString());
  }
}
