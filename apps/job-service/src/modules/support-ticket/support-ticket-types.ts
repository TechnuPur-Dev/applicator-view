import { TicketStatus , TicketCategory, TicketPriority} from '@prisma/client';


interface CreateSupportTicket {
    subject: string; // ticket subject (Required)
    description?: string; // Optional  description
    status?: TicketStatus;  
    assigneeId: number; // required 
    jobId?: number; // ooptional
    category: TicketCategory; // Nullable field worker ID
    priority: TicketPriority; // Optional start date
  
};

export { CreateSupportTicket };
