import { Component } from '@angular/core';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  public userFingerprint: string

  constructor(
    private userService: UserService
  ){
    this.userFingerprint = userService.getUserFingerprint();
  }
   

}
