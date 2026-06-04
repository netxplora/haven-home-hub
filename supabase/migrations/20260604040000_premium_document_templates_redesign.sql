-- Migration: Premium Document Templates Redesign
-- Purpose: Completely redesign the 4 core investment documents to look professional and legal.

-- 1. Contract of Sale (COS)
UPDATE public.document_templates 
SET 
  version = version + 1,
  updated_at = now(),
  name = 'Contract of Sale',
  content_html = '
  <div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; border: 1px solid #e2e8f0; background: #fff; box-shadow: inset 0 0 0 1px #0f172a, inset 0 0 0 4px #fff, inset 0 0 0 5px #0f172a;">
    
    <!-- Document Header -->
    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 40px; position: relative;">
      <h1 style="font-size: 36px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; margin: 0; color: #0f172a;">CONTRACT OF SALE</h1>
      <h2 style="font-size: 14px; font-weight: bold; color: #64748b; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px;">Haven Home Hub Legal Registry</h2>
      <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin-top: 20px; text-align: right;">REF: {{document_reference}} | ISSUED: {{issue_date}}</p>
    </div>

    <!-- Preamble -->
    <div style="margin-bottom: 30px; text-align: justify; font-size: 15px;">
      <p><strong>THIS CONTRACT OF SALE</strong> (the "Agreement") is made and entered into on this <strong>{{issue_date}}</strong>.</p>
      <div style="padding-left: 20px; margin-top: 15px;">
        <p style="margin-bottom: 10px;"><strong>BETWEEN THE VENDOR:</strong> Haven Home Hub Limited, acting as the primary documentation and holding authority for the designated property.</p>
        <p><strong>AND THE PURCHASER:</strong> <strong>{{investor_name}}</strong>, with registered email <em>{{investor_email}}</em> and contact <em>{{investor_phone}}</em>.</p>
      </div>
    </div>
    
    <!-- Recitals -->
    <div style="margin-bottom: 30px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase; font-weight: bold;">1. Description of Property</h3>
      <p style="text-align: justify; margin-bottom: 15px; font-size: 15px;">The Vendor agrees to sell, and the Purchaser agrees to purchase, all rights, title, and interest in the asset identified below, free from all encumbrances:</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 10px;">
        <tbody>
          <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 30%; background: #f8fafc; color: #0f172a;">Property ID</td><td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold;">{{property_id}}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc; color: #0f172a;">Asset Name</td><td style="padding: 10px; border: 1px solid #e2e8f0;">{{property_name}}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc; color: #0f172a;">Asset Type</td><td style="padding: 10px; border: 1px solid #e2e8f0;">{{property_type}}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc; color: #0f172a;">Location</td><td style="padding: 10px; border: 1px solid #e2e8f0;">{{property_location}}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Consideration & Financials -->
    <div style="margin-bottom: 30px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase; font-weight: bold;">2. Consideration & Payment Schedule</h3>
      <p style="text-align: justify; margin-bottom: 10px; font-size: 15px;">The total consideration for the sale of the Property is the sum of <strong>{{purchase_amount}}</strong>.</p>
      <p style="text-align: justify; margin-bottom: 10px; font-size: 15px;">The Purchaser has remitted the sum of <strong>{{amount_paid}}</strong> via verifiable channel (Ref: <em>{{transaction_reference}}</em>).</p>
      
      [[IF_OUTSTANDING]]
      <div style="background-color: #fff; border: 1px solid #f43f5e; border-left: 5px solid #f43f5e; padding: 15px; margin-top: 20px;">
        <p style="margin: 0; font-weight: bold; color: #9f1239; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Outstanding Balance Clause</p>
        <p style="margin: 8px 0 0 0; text-align: justify; font-size: 14px; color: #881337;">An outstanding balance of <strong>{{outstanding_balance}}</strong> remains. Final transfer of Deeds and ultimate legal possession shall be contingent upon the complete liquidation of this balance in accordance with the payment schedule.</p>
      </div>
      [[ENDIF_OUTSTANDING]]
    </div>

    <!-- Execution & Covenants -->
    <div style="margin-bottom: 60px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase; font-weight: bold;">3. Covenants and Execution</h3>
      <p style="text-align: justify; font-size: 15px;">The Vendor hereby covenants with the Purchaser that the property is free from all encumbrances, charges, and adverse claims. Upon full payment, the Vendor shall execute a Grant Deed transferring all residual rights to the Purchaser.</p>
    </div>

    <!-- Signatures placeholder -->
    <div style="display: flex; justify-content: space-between; margin-top: 80px; padding-top: 20px;">
      <div style="width: 40%; text-align: center;">
        <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px;"></div>
        <p style="font-weight: bold; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Purchaser</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 5px;">{{investor_name}}</p>
      </div>
      <div style="width: 40%; text-align: center; position: relative;" id="signature-block">
        <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px; position: relative; z-index: 10;"></div>
        <p style="font-weight: bold; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Vendor Execution</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 5px;">Authorized Signatory</p>
      </div>
    </div>

    <!-- Advanced Legal Metadata Footer -->
    <div style="margin-top: 80px; border-top: 1px solid #cbd5e1; padding-top: 20px; font-family: monospace; font-size: 10px; color: #64748b; text-align: center;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #0f172a; letter-spacing: 1px;">CRYPTOGRAPHIC METADATA & VERIFICATION</p>
      <p style="margin: 0 0 2px 0;">DOC ID: {{document_reference}} | VERIFY: {{verification_code}}</p>
      <p style="margin: 0 0 2px 0;">TXN REF: {{transaction_reference}}</p>
      <p style="margin: 0 0 2px 0;">ISSUED: {{issue_date}} (SYSTEM GENERATED)</p>
    </div>

  </div>'
WHERE document_type = 'contract_of_sale';

-- 2. Grant Deed (previously Deed of Assignment)
UPDATE public.document_templates 
SET 
  version = version + 1,
  updated_at = now(),
  name = 'Grant Deed',
  content_html = '
  <div class="legal-doc" style="font-family: ''Times New Roman'', Times, serif; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; border: 1px solid #e2e8f0; background: #fff; box-shadow: inset 0 0 0 1px #0f172a, inset 0 0 0 4px #fff, inset 0 0 0 5px #0f172a;">
    
    <!-- Document Header -->
    <div style="text-align: center; border-bottom: 4px double #0f172a; padding-bottom: 25px; margin-bottom: 40px;">
      <h1 style="font-size: 40px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; margin: 0; color: #0f172a;">GRANT DEED</h1>
      <p style="font-size: 14px; font-weight: bold; color: #475569; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px;">Transfer of Absolute Ownership Rights</p>
      <p style="font-size: 11px; font-family: monospace; color: #94a3b8; margin-top: 20px; text-align: right;">DOC REF: {{document_reference}}</p>
    </div>

    <!-- Preamble -->
    <div style="margin-bottom: 30px; text-align: justify; font-size: 15px;">
      <p><strong>THIS GRANT DEED</strong> is made and executed on this <strong>{{issue_date}}</strong>.</p>
      <p style="margin-top: 20px;"><strong>BY THE GRANTOR:</strong></p>
      <p>Haven Home Hub Limited (hereinafter referred to as the "GRANTOR", which expression shall where the context so admits include its successors-in-title and assigns).</p>
      <p style="margin-top: 20px;"><strong>UNTO THE GRANTEE:</strong></p>
      <p><strong>{{investor_name}}</strong> (hereinafter referred to as the "GRANTEE", which expression shall where the context so admits include their heirs, personal representatives, and assigns).</p>
    </div>
    
    <!-- Recitals -->
    <div style="margin-bottom: 30px; text-align: justify; font-size: 15px;">
      <h3 style="font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase;">Witnesseth:</h3>
      <p style="margin-bottom: 15px;">That for and in consideration of the sum of <strong>{{purchase_amount}}</strong>, the receipt of which is hereby acknowledged, the GRANTOR does hereby grant, convey, and transfer unto the GRANTEE all of its right, title, and interest in and to the following described real property:</p>
      
      <div style="padding: 20px; border: 1px solid #cbd5e1; background: #f8fafc; margin-bottom: 20px; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; font-family: monospace; font-size: 14px;"><strong>Property Name:</strong> {{property_name}}</p>
        <p style="margin: 0 0 10px 0; font-family: monospace; font-size: 14px;"><strong>Location:</strong> {{property_location}}</p>
        <p style="margin: 0; font-family: monospace; font-size: 14px;"><strong>Property ID:</strong> {{property_id}}</p>
      </div>
    </div>

    <!-- Operative Part -->
    <div style="margin-bottom: 60px; text-align: justify; font-size: 15px;">
      <p style="margin-bottom: 15px;"><strong>TO HAVE AND TO HOLD</strong> the above described premises, together with all singular the rights and appurtenances thereto in anywise belonging, unto the said GRANTEE, their heirs and assigns forever.</p>
      <p style="margin-bottom: 15px;">The GRANTOR covenants that it is lawfully seized of said property in fee simple, that the property is free from all encumbrances, and that the GRANTOR will warrant and defend the title to said property against the lawful claims of all persons whomsoever.</p>
    </div>

    <!-- Signatures -->
    <div style="margin-top: 60px;">
      <p style="text-align: center; font-style: italic; font-size: 14px; margin-bottom: 50px;">IN WITNESS WHEREOF the parties have executed this Grant Deed the day and year first above written.</p>
      <div style="display: flex; justify-content: space-between; padding-top: 20px;">
        <div style="width: 35%; text-align: center;">
          <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px;"></div>
          <p style="font-weight: bold; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Grantee</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 5px;">{{investor_name}}</p>
        </div>
        <div style="width: 35%; text-align: center; position: relative;" id="signature-block">
          <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px; position: relative; z-index: 10;"></div>
          <p style="font-weight: bold; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Grantor</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 5px;">Haven Home Hub</p>
        </div>
      </div>
    </div>

    <!-- Metadata Footer -->
    <div style="margin-top: 100px; padding-top: 15px; font-family: monospace; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9;">
      <p style="margin: 0; font-weight: bold; letter-spacing: 1px;">VERIFICATION HASH: {{verification_code}}</p>
      <p style="margin: 5px 0 0 0;">This Grant Deed is digitally bound to property ID: {{property_id}}</p>
    </div>

  </div>'
WHERE document_type = 'deed_of_assignment';

-- 3. Allocation Letter
UPDATE public.document_templates 
SET 
  version = version + 1,
  updated_at = now(),
  name = 'Allocation Letter',
  content_html = '
  <div class="legal-doc" style="font-family: ''Inter'', sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 50px; background: #fff; border: 1px solid #e2e8f0;">
    
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; border-bottom: 1px solid #cbd5e1; padding-bottom: 20px;">
      <div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: 1px;">HAVEN HOME HUB</h2>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Official Notice of Allocation</p>
      </div>
      <div style="text-align: right; font-size: 13px; font-family: monospace; color: #475569;">
        <p style="margin: 0 0 5px 0;"><strong>Date:</strong> {{issue_date}}</p>
        <p style="margin: 0;"><strong>Ref:</strong> {{document_reference}}</p>
      </div>
    </div>

    <div style="margin-bottom: 40px; font-size: 15px; border-left: 3px solid #cbd5e1; padding-left: 20px;">
      <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 13px; text-transform: uppercase; color: #64748b;">Prepared For:</p>
      <p style="margin: 0 0 2px 0; font-weight: bold; font-size: 18px; color: #0f172a;">{{investor_name}}</p>
      <p style="margin: 0 0 2px 0; color: #475569;">{{investor_email}}</p>
      <p style="margin: 0; color: #475569;">{{investor_phone}}</p>
    </div>

    <h2 style="font-size: 22px; font-weight: 800; text-transform: uppercase; text-align: center; margin-bottom: 40px; letter-spacing: 2px;">PROVISIONAL LETTER OF ALLOCATION</h2>

    <div style="text-align: justify; font-size: 15px; color: #1e293b;">
      <p style="margin-bottom: 15px;">Dear Sir/Madam,</p>
      <p style="margin-bottom: 25px;">Following the receipt and verification of your payment under reference <strong>{{transaction_reference}}</strong>, we are pleased to officially inform you that you have been provisionally allocated the property outlined below within our real estate portfolio.</p>
      
      <div style="background-color: #f8fafc; padding: 25px; border: 1px solid #e2e8f0; border-radius: 6px; margin: 30px 0;">
        <h3 style="margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">Allocation Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>
            <tr><td style="padding: 8px 0; font-weight: 600; width: 35%; color: #475569;">Property Title:</td><td style="padding: 8px 0; font-weight: bold;">{{property_name}}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #475569;">Property ID:</td><td style="padding: 8px 0; font-family: monospace;">{{property_id}}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #475569;">Location:</td><td style="padding: 8px 0;">{{property_location}}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #475569;">Amount Paid:</td><td style="padding: 8px 0; font-weight: bold;">{{amount_paid}}</td></tr>
            
            [[IF_OUTSTANDING]]
            <tr><td colspan="2"><hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 10px 0;"></td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #be123c;">Outstanding Balance:</td><td style="padding: 8px 0; color: #be123c; font-weight: bold;">{{outstanding_balance}}</td></tr>
            [[ENDIF_OUTSTANDING]]
          </tbody>
        </table>
      </div>

      <p style="margin-bottom: 15px; line-height: 1.8;">Please note that this allocation remains provisional. Physical allocation, handover of the asset, and the execution of the final Grant Deed will only be processed upon the complete settlement of any outstanding property balances and associated statutory fees.</p>
      <p style="margin-bottom: 40px; font-weight: bold;">Congratulations on your investment.</p>
    </div>

    <div style="margin-top: 80px; width: 250px; position: relative;" id="signature-block">
      <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px; position: relative; z-index: 10;"></div>
      <p style="font-weight: bold; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Management</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 5px;">Haven Home Hub Registrations</p>
    </div>

    <div style="margin-top: 60px; font-family: monospace; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
      <p style="margin: 0;">SECURE VERIFICATION HASH: {{verification_code}}</p>
    </div>

  </div>'
WHERE document_type = 'allocation_letter';

-- 4. Purchase Receipt
UPDATE public.document_templates 
SET 
  version = version + 1,
  updated_at = now(),
  name = 'Purchase Receipt',
  content_html = '
  <div class="legal-doc" style="font-family: ''Inter'', sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6; padding: 40px; background: #fff; border: 1px solid #e2e8f0;">
    
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
      <div>
        <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: 2px;">RECEIPT</h1>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Haven Home Hub Transactions</p>
      </div>
      <div style="text-align: right; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px;">
        <p style="margin: 0 0 5px 0; color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: bold;">Receipt No.</p>
        <p style="margin: 0 0 10px 0; font-family: monospace; font-weight: bold; font-size: 15px;">{{document_reference}}</p>
        <p style="margin: 0 0 5px 0; color: #64748b; text-transform: uppercase; font-size: 10px; font-weight: bold;">Payment Date</p>
        <p style="margin: 0; font-weight: bold;">{{payment_date}}</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 50px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; padding: 20px 0;">
      <div style="width: 45%;">
        <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Received From</p>
        <p style="margin: 0 0 2px 0; font-weight: bold; font-size: 16px; color: #0f172a;">{{investor_name}}</p>
        <p style="margin: 0; color: #475569; font-size: 14px;">{{investor_email}}</p>
      </div>
      <div style="width: 45%; text-align: right;">
        <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Payment Method</p>
        <p style="margin: 0 0 2px 0; font-weight: bold; font-size: 16px; color: #0f172a; text-transform: capitalize;">{{payment_method}}</p>
        <p style="margin: 0; color: #475569; font-family: monospace; font-size: 13px;">Ref: {{transaction_reference}}</p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 15px;">
      <thead>
        <tr>
          <th style="padding: 15px; text-align: left; background: #0f172a; color: #fff; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Description</th>
          <th style="padding: 15px; text-align: right; background: #0f172a; color: #fff; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 20px 15px; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 16px;">Property Acquisition Payment</p>
            <p style="margin: 0 0 5px 0; color: #475569; font-size: 14px;">{{property_name}}</p>
            <p style="margin: 0; color: #94a3b8; font-size: 12px; font-family: monospace;">ID: {{property_id}}</p>
          </td>
          <td style="padding: 20px 15px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 18px;">
            {{amount_paid}}
          </td>
        </tr>
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
      <div style="width: 350px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid #e2e8f0;">
          <span style="font-weight: 600; color: #475569;">Total Contract Value</span>
          <span style="font-weight: bold;">{{purchase_amount}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid #e2e8f0; background: #0f172a; color: #fff;">
          <span style="font-weight: 600; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Amount Paid</span>
          <span style="font-weight: bold; font-size: 18px;">{{amount_paid}}</span>
        </div>
        [[IF_OUTSTANDING]]
        <div style="display: flex; justify-content: space-between; padding: 15px;">
          <span style="font-weight: 600; color: #be123c;">Balance Due</span>
          <span style="font-weight: bold; color: #be123c;">{{outstanding_balance}}</span>
        </div>
        [[ENDIF_OUTSTANDING]]
        [[IF_NOT_OUTSTANDING]]
        <div style="display: flex; justify-content: space-between; padding: 15px;">
          <span style="font-weight: 600; color: #16a34a;">Balance Due</span>
          <span style="font-weight: bold; color: #16a34a;">0.00</span>
        </div>
        [[ENDIF_NOT_OUTSTANDING]]
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-end; position: relative;" id="signature-block">
      <div style="width: 60%; font-size: 12px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0;">This receipt is system generated and serves as official proof of payment. For any inquiries regarding this transaction, please reference the receipt number provided above.</p>
      </div>
      <div style="width: 30%; text-align: center; position: relative; z-index: 10;">
        <div style="border-bottom: 1px solid #0f172a; height: 60px; margin-bottom: 10px;"></div>
        <p style="font-weight: bold; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Authorized</p>
      </div>
    </div>

  </div>'
WHERE document_type = 'purchase_receipt';
