import { Injectable } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  // TODO: Change to actual websocket server
  private readonly URL = 'ws://localhost:3000/echo';
  private webSocketSubject = webSocket<any>(this.URL);
  public webSocket$ = this.webSocketSubject.asObservable();

  sendMessage(message: string): void {
    this.webSocketSubject.next(message);
  }
}