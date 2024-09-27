import { Component, ElementRef, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {

  @ViewChild('inputBox', { static: false }) inputBox!: ElementRef;
  
  public messages: string[] = []

  constructor(
    private chatService: ChatService
  ) { 
    this.messages = chatService.getMessages();
  }


  // Trims input & sends message via the chatService
  sendMessage(){
    
    const text = this.inputBox.nativeElement.textContent;

    if ( !(text || '').trim().length ) return;

    this.chatService.sendMessage(text.trim());

    this.inputBox.nativeElement.textContent = ""
  }
}
