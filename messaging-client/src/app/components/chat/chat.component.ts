import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { RecipientService } from '../../services/client.service';
import { combineLatestWith, Subscription, take } from 'rxjs';
import { UserService } from '../../services/user.service';
import { ChatMessage } from '../../models/chat-message';

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
  private displayedChats: ChatMessage[] = []

  constructor(
    private chatService: ChatService,
    private clientService: RecipientService,
    public userService: UserService
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

  // Sets the value of displayChats, filtering chat messeges based on the selected particilpant(s)
  private updateDisplayMessages(messages: ChatMessage[], selectedRecipients: Set<string>){
    console.log("updating displayed messages using", messages, selectedRecipients);

    this.displayedChats = messages.filter(
      (message)=>{
        // Return all public messages if public chat is selected
        if (this.clientService.publicRecipientSelected()) 
          return message.isPublic;

        else if (message.isPublic) return false;

        // Filter out messages that do not contain all selected recipients
        for (const selectedRecipient of selectedRecipients){
          const containsSelected = message.recipients.includes(selectedRecipient) || message.sender == selectedRecipient;
          if (!containsSelected) return false;
        }
        return true;
      }
    )

    console.log("New displayed messages: ", this.displayedChats)
  } 

  ngOnDestroy(): void {
    this.displayChatSubscription.unsubscribe();
  }


  // Sends appropriate message via the chat service
  public onSendClicked(){
    
    // Get input text from contenteditable div
    const text = this.inputBox.nativeElement.textContent;
    
    // Check the message contains content
    if ( !text || !text.trim().length ) return;
    
    // Send message if selected recipient is public
    if (this.clientService.publicRecipientSelected()){
      console.log("Sending public message")
      this.chatService.sendPublicMessage(text);
    }

    // Otherwise send a message to selected clients
    else{
      const selectedRecipients = this.clientService.getSelectedRecipients();
      this.chatService.sendMessage(text, selectedRecipients);
    }
  
    // Clear message input field
    this.inputBox.nativeElement.textContent = ""
  }

  public getDisplayMessages(){
    return this.displayedChats;
  }
}
