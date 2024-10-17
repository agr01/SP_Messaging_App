// Group 51: William Godfrey (a1743033) Alexandra Gramss (a1756431)
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';
import { CryptoService } from './services/crypto.service';
import { combineLatest, combineLatestWith, Subscription } from 'rxjs';
import { UserService } from './services/user.service';
import { WebSocketService } from './services/web-socket.service';
import { HeaderComponent } from './components/header/header.component';
import { DEFAULT_SERVER, DEFAULT_WEBSOCKET } from './constants';
import { SpinnerComponent } from "./components/spinner/spinner.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ChatComponent, HeaderComponent, SpinnerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  public connecting = true;
  public settingUpUser = true;
  private _connectedSubscription = new Subscription
  private _userReadySubscription = new Subscription

  
  constructor(
    private cryptoService: CryptoService,
    private userService: UserService,
    private webSocketService: WebSocketService
  ) {   }

   ngOnInit(){
    
    this.cryptoService.generateRsaKeys();
    this.webSocketService.connect();

    // Subscribe to websocket connection status
    // If ! connected -> show loading spinner
    this._connectedSubscription = this.webSocketService.connectionIsOpen$.subscribe(
      (webSocketOpen) => this.connecting = !webSocketOpen
    )

    // Subscribe to user ready status
    // If ! user ready -> show loading spinner
    this._userReadySubscription = this.userService.userReady$.subscribe(
      (userReady) => this.settingUpUser = !userReady
    )
    
   }
}
