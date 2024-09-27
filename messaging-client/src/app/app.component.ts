import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';
import { WebSocketService } from './services/web-socket.service';
import { catchError, retry, throwError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  
  constructor(
    private webSocketService: WebSocketService,
    private chatService: ChatService
  ) {
      this.webSocketService.webSocket$
      .pipe(
        catchError((error) => {
          // handle errors
          return throwError(() => new Error(error));
        }),
        retry({ delay: 5_000 }),
        takeUntilDestroyed()
      )
      .subscribe((value: string) => {
        this.chatService.addMessage(value);
      });

   }
}
