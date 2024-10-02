import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { RecipientService } from '../../services/client.service';
import { combineLatestWith, Subscription, take } from 'rxjs';
import { UserService } from '../../services/user.service';
import { ChatMessage } from '../../models/chat-message';
import { FileService } from '../../services/file.service';
import { isNonEmptyString } from '../../helpers/validators';
import { SpinnerComponent } from "../spinner/spinner.component";

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, SpinnerComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnDestroy{

  @ViewChild('inputBox', { static: false }) inputBox!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  private displayChatSubscription: Subscription
  private displayedChats: ChatMessage[] = []

  public showFileSelector: boolean = false;

  public selectedFile: File | null = null;
  public uploadedFileUrl: string | null = null;
  public fileUploadErrorMessage: string | null = null;

  public fileUploading: boolean = false;

  constructor(
    private chatService: ChatService,
    private clientService: RecipientService,
    public userService: UserService,
    private fileService: FileService
  ) { 
    // Send the server hello message once both the connection is established and the 
    // RSA keys are generated
    this.displayChatSubscription = this.chatService.messages$.pipe(
      combineLatestWith(this.clientService.selectedRecipientFingerprints$)
    ).subscribe(
      ([messages, selectedClientFingerprints]) => 
        this.updateDisplayedMessages(messages, selectedClientFingerprints)
    );
  }

  // Sets the value of displayChats, filtering chat messeges based on the selected particilpant(s)
  private updateDisplayedMessages(messages: ChatMessage[], selectedRecipients: Set<string>){

    // Return all public messages if public chat is selected
    if (this.clientService.publicRecipientSelected()){
      this.displayedChats = messages.filter(m => m.isPublic);
      return;
    }

    const userFingerprint = this.userService.getUserFingerprint();

    // Otherwise filter based on sender & recipients
    this.displayedChats = messages.filter(
      (message)=>{
        if (message.isPublic) return false;

        // Filter out messages that do not contain all selected recipients
        for (const selectedRecipient of selectedRecipients){
          const containsSelected = message.recipients.includes(selectedRecipient) || message.sender == selectedRecipient;
          if (!containsSelected) return false;
        }
        // Filter out messages that countain recipients that are not selected
        for (const recipient of message.recipients){
          if (recipient !== userFingerprint && !selectedRecipients.has(recipient)) return false;
        }
        if (message.sender !== userFingerprint && !selectedRecipients.has(message.sender)) return false

        return true;
      }
    )
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

  public onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  public onFileSubmit(): void {
    if (!this.selectedFile) {
      console.error("No file selected");
      return;
    }

    this.fileUploading = true;
    
    this.fileService.uploadFile(this.selectedFile).pipe(take(1)).subscribe({
      next: (response) => {
        this.fileUploading = false;
        this.processFileUploadResponse(response);
      },
      error: (error) => {
        this.fileUploading = false;
        this.fileUploadErrorMessage = "File upload failed"
        console.error('File upload failed:', error);
      },
    });
  }

  private processFileUploadResponse(response: any){
    
        if (!response || !response.body || !response.body.file_url) return;
        if (!isNonEmptyString(response.body.file_url)) return;

        this.uploadedFileUrl = response.body.file_url
        console.log('File uploaded successfully!', response);
  }

  public toggleFileSelector(){

    this.uploadedFileUrl = null;
    this.fileUploadErrorMessage = null;

    this.showFileSelector = !this.showFileSelector;

    if (!this.showFileSelector){
      this.fileInput.nativeElement.value = ''
      this.selectedFile = null;
    }
  }
}
