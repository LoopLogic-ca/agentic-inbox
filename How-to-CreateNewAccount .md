# **Agentic Inbox \- Create Account** 

### **Step 1: Set Up Email Routing**

Before the Worker can process mail, Cloudflare must be instructed to accept emails for the new address and forward them to your application.

> 1. Log into the Cloudflare Dashboard and navigate to **Compute \> Email Service \> Email Routing**.  
> 2. Select your domain.  
> 3. Under the **Routing Rules** tab, click **Create routing rule**.  
> 4. Set the **Custom address** (e.g., hello for hello@yourdomain.com).  
> 5. Set the **Action** to **Send to a Worker**.  
> 6. Select your deployed Agentic Inbox Worker from the dropdown menu and click **Save**.

### **Step 2: Update the Worker Allowlist**

The Agentic Inbox Worker uses an environment variable to filter incoming mail. If the new address is not explicitly listed, the Worker will drop the email.

> 1. In the Cloudflare Dashboard, navigate to **Workers & Pages** and select your Worker.  
> 2. Go to **Settings \> Variables and Secrets**.  
> 3. Locate the EMAIL\_ADDRESSES variable.  
> 4. Edit the JSON array to include the new address. Ensure each address is wrapped in its own quotation marks and separated by a comma.  
   * **Correct Format:** \["existing@domain.com", "new@domain.com"\]  
> 5. Click **Deploy** or **Save** to restart the Worker with the new configuration.

### **Step 3: Trigger Mailbox Creation**

The Agentic Inbox architecture does not use manual interface buttons to create mailboxes. Instead, it provisions an isolated SQLite database (Durable Object) the moment it receives its first approved email.

> 1. Open an external, independent email client (like a personal Gmail account).  
> 2. Send a test email to the newly configured address.  
> 3. Open your deployed Agentic Inbox web application. The new mailbox will automatically appear in the left-hand sidebar under your domain.

### **Problems Identified During Iteration**

* **The "Missing UI Button" Trap:** Standard email clients feature a "Create Mailbox" button. Agentic Inbox relies on dynamic creation, meaning the interface will never display a creation option; the database simply initializes upon receiving the first routed email.  
* **The Allowlist Rejection (Ignoring email error):** Even with perfect Cloudflare routing, the Worker will silently drop incoming mail if the destination address is missing from the EMAIL\_ADDRESSES environment variable. Checking the Worker's live logs (Observability \> Logs) is required to identify this exact handoff failure.  
* **The JSON Array Syntax Error:** When updating the EMAIL\_ADDRESSES variable, grouping multiple addresses inside a single set of quotation marks (e.g., \["email1@domain.com,email2@domain.com"\]) causes the system to read it as one invalid, concatenated email address. Each address must be formatted as an independent string within the array.

Does the new mailbox successfully appear in your interface now that the JSON syntax is corrected?