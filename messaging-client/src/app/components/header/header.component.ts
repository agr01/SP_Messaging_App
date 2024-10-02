import { Component } from '@angular/core';
import { UserService } from '../../services/user.service';
import { WebSocketService } from '../../services/web-socket.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  public userFingerprint: string

  constructor(
    private userService: UserService,
    public webSocketService: WebSocketService
  ){
    this.userFingerprint = userService.getUserFingerprint();
  }
   

}
