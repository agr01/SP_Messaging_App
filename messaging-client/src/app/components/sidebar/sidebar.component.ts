import { Component, OnDestroy, OnInit } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { Client } from '../../models/client';
import { AsyncPipe } from '@angular/common';
import { CryptoService } from '../../services/crypto.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  constructor(
    public clientService: ClientService,
    private cryptoService: CryptoService
  ) { 

  }

  // Formats the key for shortened display in the sidebar
  public formatPublicKey(key: string): string{
    return this.cryptoService.pemToBase64key(key); 
  }
  
}
