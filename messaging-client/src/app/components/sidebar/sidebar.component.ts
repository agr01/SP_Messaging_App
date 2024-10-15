import { Component, OnDestroy, OnInit } from '@angular/core';
import { RecipientService } from '../../services/recipient.service';
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
    public recipientService: RecipientService,
    private cryptoService: CryptoService
  ) { 

    this.selectedClientSubscription = this.recipientService.selectedRecipients$.subscribe(
      (c) => {
        this.selectedClients = c
      }
    );
  }

  ngOnDestroy(): void {
    this.selectedClientSubscription.unsubscribe();
  }

  public toggleSelectedClient(clientPublicKey: string){

    this.recipientService.toggleSelectedRecipient(clientPublicKey)
  }
  
  
}
