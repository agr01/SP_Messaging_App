import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';
import { CryptoService } from './services/crypto.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  
  constructor(
    private cryptoService: CryptoService
  ) {

   }

   async ngOnInit(){
    try {
      await this.cryptoService.generateRsaKeys();
    } catch (error){
      console.error("Error generating RSA keys: ", error);
    }
    
   }
}
