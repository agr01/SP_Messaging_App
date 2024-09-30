import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { combineLatestWith, Subscription } from 'rxjs';
import { Chat } from '../../models/chat';
import { CryptoService } from '../../services/crypto.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnDestroy{

  @ViewChild('inputBox', { static: false }) inputBox!: ElementRef;
  
  private displayChatSubscription: Subscription
  private displayChats: Chat[] = []

  constructor(
    private chatService: ChatService,
    private clientService: ClientService,
    private cryptoService: CryptoService,
    private userService: UserService
  ) { 
    // Send the server hello message once both the connection is established and the 
    // RSA keys are generated
    this.displayChatSubscription = 
    this.chatService.messages$.pipe(
      combineLatestWith(this.clientService.selectedClients$)
    ).subscribe(
      ([messages, selectedClients]) => this.updateDisplayMessages(messages, selectedClients)
    );
  }

  private updateDisplayMessages(messages: Chat[], selectedClients: Set<string>){
    console.log("updating displayed messages", messages, selectedClients);

    this.displayChats = messages.filter(
      (message)=>{
        console.log("Checking message", message)
        for (const participant of message.participants){
          console.log("checking participant", participant)

          const participantIsSelected = selectedClients.has(participant);
          console.log("Participant is selected", participantIsSelected);

          const participantIsUser = participant == this.userService.getUserFingerprint()
          console.log("Participant is user", participantIsUser)

          if (!participantIsSelected && !participantIsUser){
            return false;
          }
        }
        return true;
      }
    )
  } 

  ngOnDestroy(): void {
    this.displayChatSubscription.unsubscribe();
  }


  // Trims input & sends message via the chatService
  sendMessage(){
    
    const text = this.inputBox.nativeElement.textContent;

    if ( !(text || '').trim().length ) return;

    this.chatService.sendMessage(text.trim(), []);

    this.inputBox.nativeElement.textContent = ""
  }

  public getDisplayMessages(){
    return this.displayChats;
  }
}
