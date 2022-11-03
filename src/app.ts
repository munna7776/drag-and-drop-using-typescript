interface Validatable {
    value: string | number;
    required: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

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

// project state management
class ProjectState {
    private listeners: any[] = [];
    private projects: any[] = [];
    private static instance: ProjectState;

    private constructor() {

    }

    static getInstance() {
        if(this.instance) {
            return this.instance
        }
        this.instance = new ProjectState()
        return this.instance
    }

    addListener(listenerFunc: Function) {
        this.listeners.push(listenerFunc)
    }

    addProject(title: string, description: string, numOfPeople: number) {
        const newProjects = {
            id: Math.random().toString(),
            title,
            description,
            people: numOfPeople
        }
        this.projects.push(newProjects)
        for (const listener of this.listeners) {
            listener(this.projects.slice())
        }
    }

}

const projectState = ProjectState.getInstance()

// project-list
class ProjectList extends Component<HTMLDivElement, HTMLElement> {
    assignedProjects: any[];
    constructor(private type: "active" | "finished") {
        super("project-list", "app", false, `${type}-projects`)
        this.assignedProjects = []
        projectState.addListener((projects: any[]) => {
            this.assignedProjects = projects
            this.renderProjects()
        })
        this.renderContent()
    }

    renderProjects() {
        const ulElement = document.getElementById(`${this.type}-projects-list`)
        const listElement = document.createElement('li');
        for (const project of this.assignedProjects) {
            listElement.textContent = project.title;
            ulElement?.appendChild(listElement)
        }
    }

    renderContent() {
        this.element.querySelector("h2")!.textContent = `${this.type.toUpperCase()} PROJECTS`;
        this.element.querySelector("ul")!.id = `${this.type}-projects-list`
    }

    configure() {}

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