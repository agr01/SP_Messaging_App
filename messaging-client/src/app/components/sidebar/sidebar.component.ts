import { Component, OnDestroy, OnInit } from '@angular/core';
import { ClientService } from '../../services/client.service';
import { Client } from '../../models/client';
import { AsyncPipe } from '@angular/common';
import { CryptoService } from '../../services/crypto.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnDestroy {

  public selectedClients!: Set<string>
  private selectedClientSubscription: Subscription

  constructor(
    public clientService: ClientService,
    private cryptoService: CryptoService
  ) { 

    this.selectedClientSubscription = this.clientService.selectedClients$.subscribe(
      (c) => {
        this.selectedClients = c
        console.log("Selected clients", this.selectedClients)
      }
    );
  }

  ngOnDestroy(): void {
    this.selectedClientSubscription.unsubscribe();
  }

  // Formats the key for shortened display in the sidebar
  public formatPublicKey(key: string): string{
    return this.cryptoService.pemToBase64key(key); 
  }

  public toggleSelectedClient(client: string){
    console.log("Toggling", client)

    this.clientService.toggleSelectedClient(client)
  }
  
  
}
