import { Injectable } from '@angular/core';
import { DEFAULT_SERVER } from '../constants';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  // TODO: Match connected websocket server
  private uploadUrl = 'https://' + DEFAULT_SERVER;

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(this.uploadUrl, formData);
  }
}
