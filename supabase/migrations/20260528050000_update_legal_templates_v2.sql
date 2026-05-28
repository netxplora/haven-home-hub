-- Migration: Deep Template Intelligence & Premium Styling
-- Purpose: Overhauls the core legal documents with advanced typography, 
--          conditional blocks, and cryptographic metadata verification sections.

-- 1. Contract of Sale (COS)
UPDATE public.document_templates 
SET 
  version = version + 1,
  updated_at = now(),
  content_html = '
  <div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 40px; border: 1px solid #e2e8f0; background: #fff;">
    
    <!-- Document Header -->
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px;">
      <h1 style="font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 0; color: #0f172a;">Contract of Sale</h1>
      <h2 style="font-size: 16px; font-weight: 600; color: #64748b; margin-top: 5px;">Haven Home Hub Property Asset</h2>
      <p style="font-size: 12px; font-family: monospace; color: #94a3b8; margin-top: 10px;">REF: {{document_reference}} | ISSUED: {{issue_date}}</p>
    </div>

    <!-- Preamble -->
    <div style="margin-bottom: 30px; text-align: justify;">
      <p><strong>THIS CONTRACT OF SALE</strong> (the "Agreement") is made and entered into on this <strong>{{issue_date}}</strong>, by and between:</p>
      <div style="padding-left: 20px; margin-top: 15px;">
        <p style="margin-bottom: 10px;"><strong>1. THE VENDOR:</strong> Haven Home Hub Limited, a registered entity acting as the primary documentation and holding authority for the designated property.</p>
        <p><strong>2. THE PURCHASER:</strong> <strong>{{investor_name}}</strong>, with registered email <em>{{investor_email}}</em> and contact <em>{{investor_phone}}</em>.</p>
      </div>
    </div>
    
    <!-- Recitals -->
    <div style="margin-bottom: 30px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a;">1. DESCRIPTION OF PROPERTY</h3>
      <p style="text-align: justify; margin-bottom: 15px;">The Vendor agrees to sell, and the Purchaser agrees to purchase, all rights, title, and interest in the asset identified below, free from all encumbrances:</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 10px;">
        <tbody>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; width: 30%; background: #f8fafc;">Property ID</td><td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">{{property_id}}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Asset Name</td><td style="padding: 8px; border: 1px solid #e2e8f0;">{{property_name}}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Asset Type</td><td style="padding: 8px; border: 1px solid #e2e8f0;">{{property_type}}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Location/Coordinates</td><td style="padding: 8px; border: 1px solid #e2e8f0;">{{property_location}}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Consideration & Financials -->
    <div style="margin-bottom: 30px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a;">2. CONSIDERATION & PAYMENT SCHEDULE</h3>
      <p style="text-align: justify; margin-bottom: 10px;">The total consideration for the sale of the Property is the sum of <strong>{{purchase_amount}}</strong>.</p>
      <p style="text-align: justify; margin-bottom: 10px;">The Purchaser has remitted the sum of <strong>{{amount_paid}}</strong> via verifiable channel (Ref: <em>{{transaction_reference}}</em>).</p>
      
      [[IF_OUTSTANDING]]
      <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 15px; margin-top: 15px;">
        <p style="margin: 0; font-weight: bold; color: #881337;">OUTSTANDING BALANCE CLAUSE</p>
        <p style="margin: 5px 0 0 0; text-align: justify; font-size: 14px; color: #9f1239;">An outstanding balance of <strong>{{outstanding_balance}}</strong> remains. Final transfer of Deeds and ultimate legal possession shall be contingent upon the complete liquidation of this balance in accordance with the payment schedule.</p>
      </div>
      [[ENDIF_OUTSTANDING]]
      
      [[IF_FRACTIONAL]]
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-top: 15px;">
        <p style="margin: 0; font-weight: bold; color: #14532d;">FRACTIONAL OWNERSHIP CLAUSE</p>
        <p style="margin: 5px 0 0 0; text-align: justify; font-size: 14px; color: #166534;">This contract governs the purchase of <strong>{{units_owned}} units</strong> representing a fractional interest in the property. The total fractional investment mapped to this contract is <strong>{{amount_invested}}</strong>.</p>
      </div>
      [[ENDIF_FRACTIONAL]]
    </div>

    <!-- Execution & Covenants -->
    <div style="margin-bottom: 40px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a;">3. COVENANTS AND EXECUTION</h3>
      <p style="text-align: justify; font-size: 14px;">The Vendor hereby covenants with the Purchaser that the property is free from all encumbrances, charges, and adverse claims. Upon full payment, the Vendor shall execute a Deed of Assignment transferring all residual rights to the Purchaser.</p>
    </div>

    <!-- Signatures placeholder -->
    <div style="display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px;">
      <div style="width: 40%; text-align: center;">
        <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px;"></div>
        <p style="font-weight: bold; margin: 0;">Purchaser Signature</p>
        <p style="font-size: 12px; color: #64748b;">{{investor_name}}</p>
      </div>
      <div style="width: 40%; text-align: center; position: relative;" id="signature-block">
        <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px; position: relative; z-index: 10;"></div>
        <p style="font-weight: bold; margin: 0;">Vendor Execution</p>
        <p style="font-size: 12px; color: #64748b;">Haven Home Hub Authority</p>
      </div>
    </div>

    <!-- Advanced Legal Metadata Footer -->
    <div style="margin-top: 60px; border-top: 2px dashed #cbd5e1; padding-top: 20px; font-family: monospace; font-size: 10px; color: #64748b; background: #f8fafc; padding: 15px;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #0f172a;">CRYPTOGRAPHIC METADATA & VERIFICATION</p>
      <p style="margin: 0 0 2px 0;">DOC ID: {{document_reference}} | VERIFY: {{verification_code}}</p>
      <p style="margin: 0 0 2px 0;">TXN REF: {{transaction_reference}}</p>
      <p style="margin: 0 0 2px 0;">ISSUED: {{issue_date}} (SYSTEM GENERATED)</p>
      <p style="margin: 0 0 2px 0; color: #10b981;">&#10003; Smart-Contract Protocol Validated</p>
    </div>

  </div>'
WHERE document_type = 'contract_of_sale';

-- 2. Deed of Assignment (DOA)
UPDATE public.document_templates 
SET 
  version = version + 1,
  updated_at = now(),
  content_html = '
  <div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 40px; border: 1px solid #e2e8f0; background: #fff;">
    
    <!-- Document Header -->
    <div style="text-align: center; border-bottom: 4px double #0f172a; padding-bottom: 20px; margin-bottom: 30px;">
      <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin: 0; color: #0f172a;">DEED OF ASSIGNMENT</h1>
      <p style="font-size: 14px; font-weight: bold; color: #475569; margin-top: 5px;">Transfer of Absolute Ownership Rights</p>
      <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin-top: 15px;">DOC REF: {{document_reference}}</p>
    </div>

    <!-- Preamble -->
    <div style="margin-bottom: 30px; text-align: justify; font-size: 15px;">
      <p><strong>THIS DEED OF ASSIGNMENT</strong> is made this <strong>{{issue_date}}</strong>.</p>
      <p><strong>BETWEEN</strong></p>
      <p>Haven Home Hub Limited (hereinafter referred to as the "ASSIGNOR", which expression shall where the context so admits include its successors-in-title and assigns) of the first part.</p>
      <p><strong>AND</strong></p>
      <p><strong>{{investor_name}}</strong> (hereinafter referred to as the "ASSIGNEE", which expression shall where the context so admits include their heirs, personal representatives, and assigns) of the second part.</p>
    </div>
    
    <!-- Recitals -->
    <div style="margin-bottom: 30px; text-align: justify; font-size: 15px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase;">Whereas:</h3>
      <p style="margin-bottom: 10px;">A. The Assignor is the beneficial owner of the property known as <strong>{{property_name}}</strong> situated at <strong>{{property_location}}</strong> (the "Property").</p>
      <p style="margin-bottom: 10px;">B. The Assignee has paid the total consideration of <strong>{{purchase_amount}}</strong>, and the Assignor has agreed to transfer all rights and interests in the Property to the Assignee.</p>
    </div>

    <!-- Operative Part -->
    <div style="margin-bottom: 40px; text-align: justify; font-size: 15px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase;">Now this Deed Witnesses as Follows:</h3>
      <p style="margin-bottom: 10px;">1. In consideration of the sum of {{purchase_amount}} paid by the Assignee to the Assignor (the receipt whereof the Assignor hereby acknowledges), the Assignor HEREBY ASSIGNS unto the Assignee ALL THAT property measuring as specified in the Survey Plan, TO HOLD unto the Assignee absolutely and forever.</p>
      <p style="margin-bottom: 10px;">2. The Assignor covenants that it has the full right to assign the property and that the Assignee shall quietly possess and enjoy the property without any lawful interruption.</p>
    </div>

    <!-- Signatures -->
    <div style="margin-top: 60px;">
      <p style="text-align: center; font-style: italic; font-size: 14px; margin-bottom: 40px;">IN WITNESS WHEREOF the parties have executed this Deed the day and year first above written.</p>
      <div style="display: flex; justify-content: space-between; padding-top: 20px;">
        <div style="width: 30%; text-align: center;">
          <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px;"></div>
          <p style="font-weight: bold; margin: 0; font-size: 14px;">ASSIGNEE</p>
          <p style="font-size: 12px; color: #64748b;">{{investor_name}}</p>
        </div>
        <div style="width: 30%; text-align: center; position: relative;" id="signature-block">
          <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px; position: relative; z-index: 10;"></div>
          <p style="font-weight: bold; margin: 0; font-size: 14px;">ASSIGNOR</p>
          <p style="font-size: 12px; color: #64748b;">Authorized Signatory</p>
        </div>
      </div>
    </div>

    <!-- Metadata Footer -->
    <div style="margin-top: 80px; padding-top: 15px; font-family: monospace; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9;">
      <p style="margin: 0;">VERIFICATION HASH: {{verification_code}}</p>
      <p style="margin: 2px 0 0 0;">This document is digitally bound to property ID: {{property_id}}</p>
    </div>

  </div>'
WHERE document_type = 'deed_of_assignment';

-- 3. Allocation Letter
UPDATE public.document_templates 
SET 
  version = version + 1,
  updated_at = now(),
  content_html = '
  <div class="legal-doc" style="font-family: ''Inter'', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 40px; background: #fff;">
    
    <div style="text-align: right; margin-bottom: 40px; font-size: 14px;">
      <p><strong>Date:</strong> {{issue_date}}</p>
      <p><strong>Ref:</strong> {{document_reference}}</p>
    </div>

    <div style="margin-bottom: 40px; font-size: 15px;">
      <p><strong>TO:</strong></p>
      <p><strong>{{investor_name}}</strong></p>
      <p>{{investor_email}}</p>
      <p>{{investor_phone}}</p>
    </div>

    <h2 style="font-size: 20px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 30px;">PROVISIONAL LETTER OF ALLOCATION</h2>

    <div style="text-align: justify; font-size: 15px;">
      <p>Dear Sir/Madam,</p>
      <p>Following the receipt of your payment (Ref: <strong>{{transaction_reference}}</strong>), we are pleased to inform you that you have been provisionally allocated property within our estate.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; font-size: 16px; color: #0f172a;">ALLOCATION DETAILS</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>
            <tr><td style="padding: 5px 0; font-weight: 600; width: 40%;">Property Title:</td><td style="padding: 5px 0;">{{property_name}}</td></tr>
            <tr><td style="padding: 5px 0; font-weight: 600;">Location:</td><td style="padding: 5px 0;">{{property_location}}</td></tr>
            <tr><td style="padding: 5px 0; font-weight: 600;">Amount Paid:</td><td style="padding: 5px 0;">{{amount_paid}}</td></tr>
            
            [[IF_OUTSTANDING]]
            <tr><td style="padding: 5px 0; font-weight: 600; color: #e11d48;">Outstanding Balance:</td><td style="padding: 5px 0; color: #e11d48; font-weight: bold;">{{outstanding_balance}}</td></tr>
            [[ENDIF_OUTSTANDING]]
          </tbody>
        </table>
      </div>

      <p>Please note that this allocation is provisional. Physical allocation and final documentation (Deed of Assignment) will only be processed upon the complete settlement of any outstanding property balances and associated statutory fees.</p>
      <p>Congratulations on your investment.</p>
    </div>

    <div style="margin-top: 60px; width: 250px;" id="signature-block">
      <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px;"></div>
      <p style="font-weight: bold; margin: 0; font-size: 14px;">Management</p>
      <p style="font-size: 12px; color: #64748b;">Haven Home Hub</p>
    </div>

    <div style="margin-top: 50px; font-family: monospace; font-size: 10px; color: #94a3b8;">
      <p>SECURE VERIFICATION: {{verification_code}}</p>
    </div>

  </div>'
WHERE document_type = 'allocation_letter';
