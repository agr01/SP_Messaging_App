import { TestBed } from '@angular/core/testing';

import { CustomSanitizationService } from './custom-sanitization.service';

describe('CustomSanitizationService', () => {
  let service: CustomSanitizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomSanitizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
