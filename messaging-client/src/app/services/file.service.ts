import { Injectable, OnDestroy } from '@angular/core';
import { DEFAULT_SERVER } from '../constants';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { WebSocketService } from './web-socket.service';

@Injectable({
  providedIn: 'root'
})
export class FileService implements OnDestroy{

  // TODO: Match connected websocket server
  private uploadServer: string = DEFAULT_SERVER;

  private uploadUrl = 'https://' + DEFAULT_SERVER;

  private connectedServerSubscription = new Subscription

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService,
  ) {
    webSocketService.connectedServer$.subscribe(
      (server) => {
        this.updateServer(server);
      }
    )
  }

  ngOnDestroy(): void {
    this.connectedServerSubscription.unsubscribe();
  }

  uploadFile(file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(this.uploadUrl, formData);
  }

  // The file upload port of a given server is 100 + the websocket port
  private updateServer(newServer: string){
    const server = this.getServerAddress(newServer);
    const port = this.getPortFromAddress(newServer);
    
    if (!server || !port) return;

    this.uploadServer = server + ":" + (port + 100).toString()
    this.uploadUrl = 'https://' + this.uploadServer
  }

  // Returns the port from an address:port string as a number or null
  private getPortFromAddress(address: string): number | null {
    const parts = address.split(':');
    
    if (parts.length === 2) {
      const port = parseInt(parts[1]);
      return isNaN(port) ? null : port;
    }
  
    return null;
  }

  // Returns the server part of an address:port string
  getServerAddress(address: string): string | null {
    const parts = address.split(':');
  
    if (parts.length >= 1) {
      return parts[0];
    }
  
    return null;
  }
}
