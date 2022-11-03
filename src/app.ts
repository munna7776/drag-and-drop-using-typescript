interface Validatable {
    value: string | number;
    required: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

// drag and drop interface
interface Draggable {
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void
}

interface DragTarget {
    dragOverHandler(event: DragEvent): void;
    dropHandler(event: DragEvent): void;
    dragLeaveHandler(event: DragEvent): void;
}

enum Status { Active, Finished }

type Listener<T> = (items: T[]) => void

// validator function
function validate(validateInput: Validatable){
    let isValid = true;
    if(validateInput.required) {
        isValid = isValid && validateInput.value.toString().trim().length !== 0
    }
    if(validateInput.minLength != null && typeof validateInput.value === 'string') {
        isValid = isValid && validateInput.value.length >= validateInput.minLength;
    }
    if(validateInput.maxLength != null && typeof validateInput.value === 'string') {
        isValid = isValid && validateInput.value.length <= validateInput.maxLength;
    }
    if(validateInput.min != null && typeof validateInput.value === 'number') {
        isValid = isValid && validateInput.value >= validateInput.min;
    }
    if(validateInput.max != null && typeof validateInput.value === 'number') {
        isValid = isValid && validateInput.value <= validateInput.max;
    }
    return isValid;
}

// autobind decorator
function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
        configurable: true,
        get() {
            const boundFunc = originalMethod.bind(this);
            return boundFunc
        }
    }
    return adjDescriptor
}

// base component class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;
    constructor(templateId: string, appId: string, insertAfterBeginning: boolean, elementId?: string ) {
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;
        this.hostElement = document.getElementById(appId)! as T;

        const importedNode = document.importNode(this.templateElement.content, true);
        this.element = importedNode.firstElementChild as U;

        if(elementId) {
            this.element.id = elementId;
        }

        this.attach(insertAfterBeginning)
    }

    private attach(insertAfterBeginning: boolean) {
        this.hostElement.insertAdjacentElement(insertAfterBeginning ? "afterbegin" : "beforeend", this.element)
    }

    abstract configure(): void
    abstract renderContent(): void
}

class Project {
    constructor(
        public id: string, 
        public title: string, 
        public description: string, 
        public people: number, 
        public status: Status
    ) {}
}

class State<T> {
    protected listeners: Listener<T>[] = [];

    addListener(listenerFunc: Listener<T>) {
        this.listeners.push(listenerFunc)
    }
}

// project state management
class ProjectState extends State<Project> {
    private projects: Project[] = [];
    private static instance: ProjectState;

    private constructor() {
        super()
    }

    static getInstance() {
        if(this.instance) {
            return this.instance
        }
        this.instance = new ProjectState()
        return this.instance
    }

    addProject(title: string, description: string, numOfPeople: number) {
        const newProjects = new Project(
            Math.random().toString(),
            title,
            description,
            numOfPeople,
            Status.Active
        )
        this.projects.push(newProjects)
        for (const listener of this.listeners) {
            listener(this.projects.slice())
        }
    }

    moveProject(projectId: string, newStatus: Status) {
        const project = this.projects.find(project => project.id === projectId);
        if(project && project.status !== newStatus) {
            project.status = newStatus
            this.updateListeners()
        }
    }

    private updateListeners() {
        for (const listener of this.listeners) {
            listener(this.projects.slice())
        }
    }

}

const projectState = ProjectState.getInstance()

// project-item class
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
    private project: Project;

    get persons() {
        if(this.project.people === 1) {
            return '1 person'
        } else {
            return `${this.project.people} persons`
        }
    }

    constructor(hostId: string, project: Project) {
        super("single-project", hostId, false, project.id )
        this.project = project

        this.configure()
        this.renderContent()
    }

    @autobind
    dragStartHandler(event: DragEvent): void {
        event.dataTransfer!.setData("text/plain", this.project.id)
        event.dataTransfer!.effectAllowed = "move";
    }

    @autobind
    dragEndHandler(event: DragEvent): void {
        console.log(event)
    }

    configure(): void {
        this.element.addEventListener("dragstart", this.dragStartHandler)
        this.element.addEventListener("dragend", this.dragEndHandler);
    }

    renderContent(): void {
        this.element.querySelector("h2")!.textContent = this.project.title
        this.element.querySelector("h3")!.textContent = this.persons + ' assigned'
        this.element.querySelector("p")!.textContent = this.project.description
    }
}


// project-list class
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget {
    assignedProjects: Project[];
    constructor(private type: "active" | "finished") {
        super("project-list", "app", false, `${type}-projects`)
        this.assignedProjects = []
        
        this.configure()
        this.renderContent()
    }

    renderContent() {
        this.element.querySelector("h2")!.textContent = `${this.type.toUpperCase()} PROJECTS`;
        this.element.querySelector("ul")!.id = `${this.type}-projects-list`
    }

    @autobind
    dragOverHandler(event: DragEvent): void {
        if(event.dataTransfer && event.dataTransfer.types[0] === "text/plain") {
            event.preventDefault()
            const ulElement = this.element.querySelector("ul")!
            ulElement.classList.add("droppable")
        }
    }

    @autobind
    dropHandler(event: DragEvent): void {
        const projectId = event.dataTransfer!.getData("text/plain");
        projectState.moveProject(projectId, this.type === 'active' ? Status.Active : Status.Finished)
    }

    @autobind
    dragLeaveHandler(_: DragEvent): void {
        const ulElement = this.element.querySelector("ul")!
        ulElement.classList.remove("droppable")
    }

    configure() {
        this.element.addEventListener("dragover", this.dragOverHandler)
        this.element.addEventListener("dragleave", this.dragLeaveHandler)
        this.element.addEventListener("drop", this.dropHandler)

        projectState.addListener((projects: Project[]) => {
            const relevantProjects = projects.filter((project) => {
                if(this.type === "active") {
                    return project.status === Status.Active
                }
                return project.status === Status.Finished
            })
            this.assignedProjects = relevantProjects
            this.renderProjects()
        })
    }

    renderProjects() {
        const ulElement = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement;
        ulElement.innerHTML = '';
        for (const project of this.assignedProjects) {
            new ProjectItem(this.element.querySelector("ul")!.id , project)
        }
    }

}


// project input class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;

    constructor() {
        super("project-input", "app", true, "user-input")

        this.titleInputElement = this.element.querySelector("#title")!;
        this.descriptionInputElement = this.element.querySelector("#description")!;
        this.peopleInputElement = this.element.querySelector("#people")!;

        this.configure()
    }

    configure() {
        this.element.addEventListener("submit", this.submitHandler)
    }

    renderContent() {}

    private gatherUserInputVaues(): [string, string, number] | void {
        const titleValue = this.titleInputElement.value;
        const descriptionValue = this.descriptionInputElement.value;
        const peopleValue = this.peopleInputElement.value;

        const titleValidator: Validatable = {
            value: titleValue,
            required: true,
        }

        const descriptionValidator: Validatable = {
            value: descriptionValue,
            required: true,
            minLength: 5
        }

        const peopleValidator: Validatable = {
            value: peopleValue,
            required: true,
            min: 1,
            max: 10
        }

        if(
            !validate(titleValidator) ||
            !validate(descriptionValidator) ||
            !validate(peopleValidator)
        ) {
            alert("Invalid Input, please try again!")
        }

        return [titleValue, descriptionValue, +peopleValue]
    }

    private clearInputs() {
        this.titleInputElement.value = '';
        this.descriptionInputElement.value = '';
        this.peopleInputElement.value = '';
    }

    @autobind
    private submitHandler(event: Event) {
        event.preventDefault();
        const userInput = this.gatherUserInputVaues()
        if(Array.isArray(userInput)) {
           projectState.addProject(...userInput)
            this.clearInputs()
        }
    }
}

const projectInput = new ProjectInput()
const prjList1 = new ProjectList("active")
const prjList2 = new ProjectList("finished")