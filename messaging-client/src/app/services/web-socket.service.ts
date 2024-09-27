import { Injectable } from '@angular/core';
import { webSocket } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private readonly URL = 'ws://localhost:3000';
  private webSocketSubject = webSocket<string>(this.URL);
  public webSocket$ = this.webSocketSubject.asObservable();

  sendMessage(message: string): void {
    this.webSocketSubject.next(message);
  }
}