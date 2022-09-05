import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DataTableDirective } from 'angular-datatables';
import { first, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { dtLanguage } from '../../../core/constants/datatable';
import { CurrentUser } from '../../../core/models/auth.models';
import { DataTablesResponse } from '../../../core/models/datatable.modal';
import { Ticket, TicketAssignRequest } from '../../../core/models/ticket.model';
import { AuthenticationService } from '../../../core/service/auth.service';
import { SpinnerService } from '../../../core/service/spinner.service';
import { StaffService } from '../../../core/service/staff.service';
import { TicketService } from '../../../core/service/ticket.service';
import { ToastService } from '../../../core/service/toast.service';
import { PermissionModule, TicketPriority, TicketStatus, UserType } from '../../../shared/enums/enum';



@Component({
  selector: 'app-tickets-display',
  templateUrl: './tickets-display.component.html',
  styleUrls: ['./tickets-display.component.scss']
})
export class TicketsDisplayComponent implements AfterViewInit, OnDestroy, OnInit {
    [x: string]: any;

    timezoneOffset: any;
    notificationText: string = '';

    @ViewChild("editTicketModal") modalContent!: TemplateRef<any>;

    ticketPriority: typeof TicketPriority = TicketPriority;
    ticketStatus: typeof TicketStatus = TicketStatus;
    messages!: string;
    disableAssignButton: boolean = false;
    disableAssignSpinner: boolean = false;

    disableStatusButton: boolean = false;
    disableStatusSpinner: boolean = false;


    public ticketPriorityTypes = Object.values(this.ticketPriority).filter(
        (value) => typeof value === 'number'
    );
    public ticketStatusTypes = Object.values(this.ticketStatus).filter(
        (value) => typeof value === 'number'
    );
    ticketId!: number;
    ticketIdDelete!: string;
    records: any;
    ticketsList?: any;
    pageSizeOptions: number[] = [10, 25, 50, 100];
    isTicketAddMode!: boolean;
    ticketForm!: FormGroup; 
    totalRecords: number = 0;
    ticketModel!: any[];
    myTicketmodel!: any[];
    allStaff!: any[];

    dtOptions: DataTables.Settings = {};
    dtOptionsMyTickets: DataTables.Settings = {};
  
    @ViewChild("ticket") dtElement!: DataTableDirective
    @ViewChild("myTickets")
    dtElementMyTickets!: DataTableDirective

    dtTrigger: any = new Subject();
    dtTriggerMyTickets: any = new Subject();

    currentUser!: CurrentUser | null;
    userPermission !: Array<number> | undefined;
    moduleType: typeof PermissionModule = PermissionModule;
    userType: typeof UserType = UserType;
    currentUserType!: number;
    isAllowed: boolean = false;

    public searchText: string = ''
    public tickets: Ticket[] | undefined;

    constructor(private ticketService: TicketService,   
        private modalService: NgbModal,
        private fb: FormBuilder,        
        private toast: ToastService,
        private spinner: SpinnerService,
        private staffService: StaffService,
        private http: HttpClient,
        private authenticationService: AuthenticationService    ) {

    }

   
    ngOnInit(): void {
        this.loadPermissions();
    }
    loadPermissions() {       
        this.currentUser = this.authenticationService.currentUser();
        this.userPermission = this.authenticationService.currentPermissions();
        this.currentUserType = this.currentUser?.userType != undefined ? this.currentUser?.userType : 0;
        if (this.userType.Yopla == this.currentUserType || this.userType.Client == this.currentUserType || this.userType.EndUser == this.currentUserType) {
            if (!this.currentUser?.isSuperAdmin) {
                this.isAllowed = this.userPermission != undefined ? this.userPermission?.includes(this.moduleType.SubscribersAndSupport) : false;
            } else {
                this.isAllowed = true;
            }
            if (this.isAllowed) {
              
                this.getAllStaff();
                this.getAllTickets();
                this.getMyAllTickets();
                this.ticketForm = this.fb.group({
                    ticketIdFormControl: [''],
                    assignUserFormControl: [''],
                    ticketPriorityFormControl: ['', Validators.required],
                    ticketStatusFormControl: ['', Validators.required]

                });
            }
        }
    }
    get ticketform() { return this.ticketForm.controls; }

    onSubmit = (ticketFormValue: any) => {
         
        if (this.ticketForm.valid)
        {     

            this.disableAssignSpinner = true;
            this.disableAssignButton = true;
            this.executeTicketCreation(ticketFormValue);
   
        }
    };   
    public executeTicketCreation = (ticketFormValue: {
        assignUserFormControl: string;
        ticketPriorityFormControl: number;
        ticketStatusFormControl: number;
    }) => {       
        let ticketAssign: TicketAssignRequest = {
            AssignedToId: ticketFormValue.assignUserFormControl != null? ticketFormValue.assignUserFormControl:"",
            PriorityEnumId: Number(ticketFormValue.ticketPriorityFormControl),
            Id: this.isTicketAddMode ? 0 : Number(this.ticketId),
            StatusEnumId: Number(ticketFormValue.ticketStatusFormControl),
        };

        this.ticketService.assignTicket(ticketAssign).subscribe(
            {
                next: (data: any) => {
                   
                    if (data.succeeded) {
                        this.modalService.dismissAll();
                        this.toast.success(data.messages);
                        this.ngAfterViewInit(); 
                    }
                    else {

                        for (var index in data.messages) {
                            this.toast.error(data.messages[index]);
                        }
                    }
                    this.disableAssignSpinner = false;
                    this.disableAssignButton = false;
                },
                error: (error: any) => {
                     
                    this.toast.error("Something went wrong");                  
                    this.disableAssignSpinner = false;
                    this.disableAssignButton = false;

                },
            });
        this.disableAssignSpinner = false;
        this.disableAssignButton = false;

        
    };
    confirmDelete() {
        this.ticketService.delete(this.ticketIdDelete).subscribe({
            next: (data: any) => {
                if (data.succeeded) {
                    this.modalService.dismissAll();
                    this.getAllTickets();
                }
                else
                {
                    for (var index in data.messages) {
                        this.toast.error(data.messages[index]);
                    }
                }
            },
            error: (error: any) => {
                  this.toast.error("Something went wrong");
               
            },
        });
    }
    getAllStaff() {
          
        this.staffService.getAllStaff().pipe(first()).subscribe({
            next: (data: any) => {
               
                if (data.succeeded)
                {
                    this.allStaff = data.data;
                }
                else
                {
                    for (var index in data.messages) {
                        this.toast.error(data.messages[index]);
                    }
                }
            },
            error: (error: any) => {
                this.toast.error("Something went wrong");               
            },
        })
       
    }
    getAllTickets() {
        this.spinner.show();
        this.dtOptions = {
            pageLength: 10,
            serverSide: true,
            processing: true,
            destroy: true,
            language: dtLanguage,
            ajax: (dataTablesParameters: any, callback) => {
                this.http
                    .post<DataTablesResponse>(
                        `${environment.apiUrl}/api/v1/Ticket/GetAllTicket`,
                        dataTablesParameters, {}
                ).subscribe(resp =>
                {                     
                    this.spinner.hide();
                    
                        this.ticketModel = resp.data.data;
                        callback({
                            recordsTotal: resp.data.recordsTotal,
                            recordsFiltered: resp.data.recordsFiltered,
                            data: []
                        });
                    });
            },
            order: [[0, 'desc']],
            columns: [{ data: 'Id' },
                { data: 'AssignedToUser.FirstName' },
                { data: 'TicketPriority.Priority' },
                { data: 'RaiseDate' },
                { data: 'TicketStatus.Status' }
              ]

        };


    }
    getMyAllTickets() {
        this.spinner.show();
        this.dtOptionsMyTickets = {
            pageLength: 10,
            serverSide: true,
            processing: true,
            destroy: true,
            language: dtLanguage,
            ajax: (dataTablesParameters: any, callback) => {
                this.http
                    .post<DataTablesResponse>(
                        `${environment.apiUrl}/api/v1/Ticket/GetMyAllTicket`,
                        dataTablesParameters, {}
                    ).subscribe(resp => {
                        this.spinner.hide();
                        this.myTicketmodel = resp.data.data;
                        callback({
                            recordsTotal: resp.data.recordsTotal,
                            recordsFiltered: resp.data.recordsFiltered,
                            data: []
                        });

                    });
            },
            order: [[0, 'desc']],
            columns: [
                { data: 'Id' },
                { data: 'RaiseDate' },
                { data: 'TicketStatus.Status' },
                { data: 'AssignedToUser.FirstName', orderable: false }]    
        };
    }
    ngAfterViewInit(): void {
        this.dtTrigger.next();
        this.dtTriggerMyTickets.next();
    }
    ngOnDestroy(): void {      
        this.dtTrigger.unsubscribe();
        this.dtTriggerMyTickets.unsubscribe();
    }  
    getTicketById(ticketId: number) {      
        this.ticketService.getById(ticketId).pipe(first()).subscribe({
            next: (data: any) => {
                 
                if (data.succeeded) {
                    this.ticketForm.patchValue({
                        assignUserFormControl: data.data.assignedToId,
                        ticketPriorityFormControl: data.data.ticketPriority.ticketPriorityEnumId,
                        ticketStatusFormControl: data.data.ticketStatus.ticketStatusEnumId
                    });
                    this.modalService.open(this.modalContent, { centered: false });
                }
                else
                {
                    for (var index in data.messages) {
                        this.toast.error(data.messages[index]);
                    }
                }
            },
             error: (error: any) => {

                 this.toast.error("Something went wrong");
            },
        })
      
    }       
  
    openEditTicketModal(event: any): void {
        
        event.stopPropagation();
        this.resetEditTicketModal();
        this.ticketId = event.target.getAttribute('id');
        this.isTicketAddMode = false;
        this.getTicketById(this.ticketId);
    }
    openDeletetDialog(event: any) {

        event.stopPropagation();      

        this.productIdDelete = event.target.getAttribute('id');
        this.modalService.open(this.modalContentDelete, { centered: false });
    }
    resetEditTicketModal() {
        this.ticketForm.reset();
    }
    public hasError = (controlName: string, errorName: string) => {
        return this.ticketform.controls[controlName].hasError(errorName);
    }
 
  
}
