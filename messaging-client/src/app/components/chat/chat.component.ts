import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { RecipientService } from '../../services/client.service';
import { combineLatestWith, Subscription, take } from 'rxjs';
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
    private clientService: RecipientService,
    private userService: UserService
  ) { 
    // Send the server hello message once both the connection is established and the 
    // RSA keys are generated
    this.displayChatSubscription = this.chatService.messages$.pipe(
      combineLatestWith(this.clientService.selectedRecipientFingerprints$)
    ).subscribe(
      ([messages, selectedClientFingerprints]) => 
        this.updateDisplayMessages(messages, selectedClientFingerprints)
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
    
    // Get input text from contenteditable div
    const text = this.inputBox.nativeElement.textContent;
    
    // Remove leadin & trailing whitespace
    const message = text.trim();
    // Check the message contains content
    if ( !message || !message.trim().length ) return;
    
    // Send message if selected recipient is public
    if (this.clientService.publicRecipientSelected()){
      console.log("Sending public message")
      this.chatService.sendPublicMessage(text);
    }

    // Otherwise send a message to selected clients
    else{
      const selectedClients = this.clientService.getSelectedRecipients();
      this.chatService.sendMessage(message, selectedClients);
    }
  
    // Clear message input field
    this.inputBox.nativeElement.textContent = ""
  }

  public getDisplayMessages(){
    return this.displayChats;
  }
}
