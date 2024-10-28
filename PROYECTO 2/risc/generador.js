import { builtins } from "./builtins.js"
import { registers as r } from "./constantes.js"
import { stringTo32BitsArray, stringTo1ByteArray, numberToF32 } from "./utils.js"

class Instruction {

    constructor(instruccion, rd, rs1, rs2){
        this.instruccion = instruccion
        this.rd = rd
        this.rs1 = rs1
        this.rs2 = rs2
    }

    toString(){
        const operandos = []
        if(this.rd !== undefined) operandos.push(this.rd)
        if(this.rs1 !== undefined) operandos.push(this.rs1)
        if(this.rs2 !== undefined) operandos.push(this.rs2)

        return `${this.instruccion} ${operandos.join(', ')}`
    }
    
}

export class Generador{


    constructor(){
        this.instrucciones = []
        this.objectStack = []
        this.depth = 0
        this._usedBuiltins = new Set()
        this._labelCounter = 0
        this.instruccionesDeFunciones = []
    }


    getLabel() {
        return `L_${this._labelCounter++}`
    }

    addLabel(label) {
        label = label || this.getLabel()
        this.instrucciones.push(new Instruction(`${label}:`))
        return label
    }

    add(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('add', rd, rs1, rs2))
    }

    sub(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('sub', rd, rs1, rs2))
    }

    mul(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('mul', rd, rs1, rs2))
    }

    div(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('div', rd, rs1, rs2))
    }

    rem(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('rem', rd, rs1, rs2))
    }
    addi(rd, rs1, inmediato){
        this.instrucciones.push(new Instruction('addi', rd, rs1, inmediato))
    }

    sw(rs1, rs2, inmediato = 0) {
        this.instrucciones.push(new Instruction('sw', rs1, `${inmediato}(${rs2})`))
    }

    sb(rs1, rs2, inmediato = 0){
        this.instrucciones.push(new Instruction('sb', rs1, `${inmediato}(${rs2})`))
    }

    lw(rd, rs1, inmediato = 0) {
        this.instrucciones.push(new Instruction('lw', rd, `${inmediato}(${rs1})`))
    }

    lb(rd, rs1, inmediato = 0){
        this.instrucciones.push(new Instruction('lb', rd, `${inmediato}(${rs1})`))
    }


    // SALTOS CONDICIONALES

    /**
     * ==
     */
    beq(rs1, rs2, label){
        this.instrucciones.push(new Instruction('beq', rs1, rs2, label))
    }

    /**
     * !=
     */
    bne(rs1, rs2, label){
        this.instrucciones.push(new Instruction('bne', rs1, rs2, label))
    }

    /**
     * <
     */
    blt(rs1, rs2, label){
        this.instrucciones.push(new Instruction('blt', rs1, rs2, label))
    }

    /**
     * >=
     */
    bge(rs1, rs2, label){
        this.instrucciones.push(new Instruction('bge', rs1, rs2, label))
    }

    li(rd, inmediato) {
        this.instrucciones.push(new Instruction('li', rd, inmediato))
    }

    la(rd, label){
        this.instrucciones.push(new Instruction('la', rd, label))
    }

    push(rd = r.T0) {
        this.addi(r.SP, r.SP, -4) // 4 bytes = 32 bits
        this.sw(rd, r.SP)
    }

    pushFloat(rd = r.FT0){
        this.addi(r.SP, r.SP, -4)
        this.fsw(rd, r.SP)
    }

    pop(rd = r.T0) {
        this.lw(rd, r.SP)
        this.addi(r.SP, r.SP, 4)
    }

    jal(label) {
        this.instrucciones.push(new Instruction('jal', label))
    }

    jalr(rd, rs1, imm){
        this.instrucciones.push(new Instruction('jalr', rd, rs1, imm))
    }

    j(label){
        this.instrucciones.push(new Instruction('j', label))
    }

    ret() {
        this.instrucciones.push(new Instruction('ret'))
    }

    ecall() {
        this.instrucciones.push(new Instruction('ecall'))
    }

    callBuiltin(builtinName) {
        if(!builtins[builtinName]) {
            throw new Error(`Builtin ${builtinName} not found`)
        }
        this._usedBuiltins.add(builtinName)
        this.jal(builtinName)
    }

    printInt(rd = r.A0) {

        if (rd !== r.A0) {
            this.push(r.A0)
            this.add(r.A0, rd, r.ZERO)
        }

        // Verificar si es null (-1 en este caso)
        const printEndLabel = this.getLabel()
        const printNullLabel = this.getLabel()

        // Cargamos -1 en un temporal solo para comparar
        this.li(r.T1, -1)
        this.beq(r.A0, r.T1, printNullLabel)

        // si no es -1, se hace el numero normal (no hay division sobre 0)
        this.li(r.A7, 1)
        this.ecall()
        this.j(printEndLabel)

        // Imprimir "null"
        this.addLabel(printNullLabel)
        this.printStringLiteral("null")

        this.addLabel(printEndLabel)


        if (rd !== r.A0) {
            this.pop(r.A0)
        }

    }

    printString(rd = r.A0){
        if(rd !== r.A0){
            this.push(r.A0)
            this.add(r.A0, rd, r.ZERO)
        }

        this.li(r.A7, 4)
        this.ecall()

        if(rd !== r.A0){
            this.pop(r.A0)
        }

    }

    printChar() {
        this.li(r.A7, 11)
        this.ecall()      
    }
    
    printFloat(){
        this.li(r.A7, 2)
        this.ecall()
    }

    printBoolean(rd = r.A0) {
        const trueLabel = this.getLabel()
        const endLabel = this.getLabel()
        
        if (rd !== r.A0) {
            this.add(r.A0, rd, r.ZERO)
        }
        
        // Si A0 es 1, salta a imprimir "true"
        this.bne(r.A0, r.ZERO, trueLabel)
        
        // Imprime "false"
        this.printStringLiteral("false")
        this.j(endLabel)
        
        // Imprime "true"
        this.addLabel(trueLabel)
        this.printStringLiteral("true")
        
        this.addLabel(endLabel)
    }

    
    endProgram() {
        this.li(r.A7, 10)
        this.ecall()
    }

    comment(text) {
        this.instrucciones.push(new Instruction(`# ${text}`))
    }

    pushConstant(object){
        let length = 0

        switch (object.type) {
            case "int":
                this.li(r.T0, object.valor)
                this.push()
                length = 4
                break
            case "string":
                const stringArray = stringTo1ByteArray(object.valor)

                this.comment(`Pushing string ${object.valor}`)
                //this.addi(r.T0, r.HP, 4)
                //this.push(r.T0)
                this.push(r.HP)

                stringArray.forEach((charChode) => {
                    this.li(r.T0, charChode)
                    //this.push(r.T0)
                    //this.addi(r.HP, r.HP, 4)
                    //this.sw(r.T0, r.HP)

                    this.sb(r.T0, r.HP)
                    this.addi(r.HP, r.HP, 1)
                })

                //length = stringArray.length * 4
                length = 4
                break
            case "char":
                this.li(r.T0, object.valor.charCodeAt(0))
                //this.sb(r.T0, r.HP) // esto fue agregado
                //this.addi(r.HP, r.HP, 1) // esto fue agregado
                this.push(r.T0) 
                length = 4
                break
                
            case "boolean":
                this.li(r.T0, object.valor ? 1 : 0)
                this.push(r.T0)
                length = 4
                break

                /*
            case "boolean":
                this.push(r.HP) 

                const boolStr = object.valor ? "true" : "false"

                for (let i = 0; i < boolStr.length; i++) {
                    this.li(r.T0, boolStr.charCodeAt(i))
                    this.sb(r.T0, r.HP)
                    this.addi(r.HP, r.HP, 1)
                }
                
                this.sb(r.ZERO, r.HP)
                this.addi(r.HP, r.HP, 1)
                
                length = object.valor ? 4 : 5 // "true" length or "false" length
                //length = 4
                break
                */
            case "float":
                const ieee754 = numberToF32(object.valor)
                this.li(r.T0, ieee754)
                this.push(r.T0)
                length = 4
                break

            default:
                break
        }

        this.pushObject({type: object.type, length, depth: this.depth})

    }

    pushObject(object){
        //this.objectStack.push(object)
        this.objectStack.push({
            ...object, 
            depth: this.depth
        })
    }

    popFloat(rd = r.FT0){
        this.flw(rd, r.SP)
        this.addi(r.SP, r.SP, 4)
    }


    popObject(rd = r.T0){
        const object = this.objectStack.pop()
        switch (object.type) {
            case "int":
                this.pop(rd)
                break
            case "string":
                /*
                this.addi(rd, r.SP, 0)
                this.addi(r.SP, r.SP, object.length)
                */
                this.pop(rd)
                break
            case "char":
                this.pop(rd)
                break
            case "boolean":
                this.pop(rd)
                break
            case "float":
                this.popFloat(rd)
                break
            default:
                break
        }
        return object
    }

    getTopObject(){
        return this.objectStack[this.objectStack.length - 1]
    }

    /* 
        Funciones para entornos 
    */
    newScope(){
        this.depth++
    }

    endScope(){
        let byteOffset = 0
        for (let i = this.objectStack.length - 1; i >= 0; i--) {
            if(this.objectStack[i].depth === this.depth){
                byteOffset += this.objectStack[i].length
                this.objectStack.pop()

            }else{

                break

            }
        }

        this.depth--
        return byteOffset

    }

    tagObject(id){
        this.objectStack[this.objectStack.length - 1].id = id
    }

    getObject(id){
        let byteOffset = 0
        for (let i = this.objectStack.length - 1; i >= 0; i--) {
            if(this.objectStack[i].id === id){
                return [byteOffset, this.objectStack[i]]
            }
            byteOffset += this.objectStack[i].length
        }
        throw new Error(`Variable ${id} not found`);
        
    }


    toString() {
        this.comment("Fin del programa")
        this.endProgram()
        this.comment("Builtins")
        this.instruccionesDeFunciones.forEach(instruccion => this.instrucciones.push(instruccion))
            
        Array.from(this._usedBuiltins).forEach(builtinName => {
            this.addLabel(builtinName)
            builtins[builtinName](this)
            this.ret()
        })

        return `.data
heap:
.text
# inicializando el heap pointer
        la ${r.HP}, heap
main:
    ${this.instrucciones.map(instruccion => `${instruccion}`).join('\n')}
`
    }

    // Instrucciones flotantes

    fadd(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('fadd.s', rd, rs1, rs2))
    }

    fsub(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('fsub.s', rd, rs1, rs2))
    }

    fmul(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('fmul.s', rd, rs1, rs2))
    }

    fdiv(rd, rs1, rs2){
        this.instrucciones.push(new Instruction('fdiv.s', rd, rs1, rs2))
    }

    fli(rd, inmediato){
        this.instrucciones.push(new Instruction('fli.s', rd, inmediato))
    }

    fmv(rd, rs1){
        this.instrucciones.push(new Instruction('fmv.s', rd, rs1))
    }

    flw(rd, rs1, inmediato = 0){
        this.instrucciones.push(new Instruction('flw', rd, `${inmediato}(${rs1})`))
    }

    fsw(rs1, rs2, inmediato = 0){
        this.instrucciones.push(new Instruction('fsw', rs1, `${inmediato}(${rs2})`))
    }

    fcvtsw(rd, rs1) {
        this.instrucciones.push(new Instruction('fcvt.s.w', rd, rs1))
    }

    // Relacionales
    feq(rs1, rs2) {
        this.instrucciones.push(new Instruction('feq.s', 'a0', rs1, rs2))
    }
    
    flt(rs1, rs2) {
        this.instrucciones.push(new Instruction('flt.s', 'a0', rs1, rs2))
    }
    
    fle(rs1, rs2) {
        this.instrucciones.push(new Instruction('fle.s', 'a0', rs1, rs2))
    }



    // Operaciones auxiliar != para los flotantes y string
    xori(rd, rs1, inmediato) {
        this.instrucciones.push(new Instruction('xori', rd, rs1, inmediato))
    }

    getFrameLocal(index){
        const frameRelativeLocal = this.objectStack.filter(obj => obj.type === "local")
        return frameRelativeLocal[index]
    }

    printStringLiteral(string){
        const stringArray = stringTo1ByteArray(string)
        stringArray.pop()

        this.comment(`Imprimiendo literal ${string}`);

        stringArray.forEach((charCode) => {
            this.li(r.A0, charCode)
            this.printChar()
        })
    }

}

