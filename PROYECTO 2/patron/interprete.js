import { Entorno } from "../entorno/entorno.js";
import { FuncionForanea } from "./funciones/foranea.js";
import { Invocable } from "./funciones/invocable.js";
import { nativas } from "./funciones/nativas.js";
import nodos, { AccesoVariable, DeclaracionArreglo } from "./nodos.js";
import { BreakException, ContinueException, ReturnException } from "./sentencias_transferencia/transferencia.js";
import { Instancia } from "./structs/instancia.js";
import { Struct } from "./structs/struct.js";
import { BaseVisitor } from "./visitor.js";


export class InterpreterVisitor extends BaseVisitor{


    constructor(){
        super()
        this.entornoActual = new Entorno()

        //funciones nativas
        Object.entries(nativas).forEach(([nombre, funcion]) => {
            this.entornoActual.set(nombre, funcion)
        })

        this.salida = ""
    }

    //ESTOS COSOS DE AQUI ES PARA QUE LOS node DE LOS visit NO PIERDAN EL TIPADO
    /**
    * @type {BaseVisitor['visitOperacionBinaria']}
    */

    visitOperacionBinaria(node){
        const izq = node.izq.accept(this)
        const der = node.der.accept(this)
        switch(node.op){

            case "+":
                return izq + der
            case "-":
                return izq - der
            case "*":
                return izq * der
            case "/":
                return izq / der
            case "%":
                return izq % der
            case "<=":
                return izq <= der
            case "<":
                return izq < der
            case ">":
                return izq > der
            case ">=":
                return izq >= der
            case "==":
                return izq == der
            case "!=":
                return izq != der
            case "&&":
                return izq && der
            case "||":
                return izq || der
            default:
                throw new Error("OPERADOR NO SOPORTADO:"+node.op)

        }
    }

    /**
    * @type {BaseVisitor['visitOperacionUnaria']}
    */

    visitOperacionUnaria(node){
        const exp = node.exp.accept(this)

        switch(node.op){
            case "-":
                return -exp
            case "!":
                return !exp
            default:
                throw new Error("OPERADOR NO SOPORTADO:"+node.op)

        }
    }


    /**
    * @type {BaseVisitor['visitNumero']}
    */

    visitNumero(node){
        return node.valor
    }

    /** 
    * @type {BaseVisitor['visitAgrupacion']}
    */

    visitAgrupacion(node){
        return node.exp.accept(this)
    }

    /** 
    * @type {BaseVisitor['visitDeclaracionVariable']}
    */

    visitDeclaracionVariable(node){
        const nombreVariable = node.id
        const tipoVariable = node.tipo
        let valorVariable =  null
        
        if (node.exp !== null) {
            valorVariable = node.exp.accept(this) // Asignar valor si hay expresión
        }
        
        //this.entornoActual.set(nombreVariable, valorVariable)
        this.entornoActual.set(nombreVariable, { tipo: tipoVariable, valor: valorVariable })

    }

    /** 
    * @type {BaseVisitor['visitAccesoVariable']}
    */
    visitAccesoVariable(node){

        const nombreVariable = node.id
        const valorVariable = this.entornoActual.get(nombreVariable)

        console.log(valorVariable)
        return valorVariable

    }

    /** 
    * @type {BaseVisitor['visitPrint']}
    */  
    visitPrint(node){
        const valor = node.exp
        
        valor.forEach(element => {
            let impresiones = element.accept(this)
            this.salida += impresiones + " "
        })

        this.salida += "\n"
        

    }

    /** 
    * @type {BaseVisitor['visitExpresionStmt']}
    */  

    visitExpresionStmt(node) {
        node.exp.accept(this);
    }

    /** 
    * @type {BaseVisitor['visitAsignacion']}
    */  

    visitAsignacion(node) {
        const valorVariableNuevo = node.asignacion.accept(this)
        switch (node.op) {
            case "=":
                this.entornoActual.asignar(node.id, valorVariableNuevo)
                break
            case "+=":
                const valorAnterior1 = this.entornoActual.get(node.id)
                const suma = valorVariableNuevo + valorAnterior1
                this.entornoActual.asignar(node.id, suma)
                break
            case "-=":
                const valorAnterior2 = this.entornoActual.get(node.id)
                const resta = valorVariableNuevo - valorAnterior2
                this.entornoActual.asignar(node.id, resta)
                break
            default:
                break
        }
        
        return valorVariableNuevo
    }


    /** 
    * @type {BaseVisitor['visitBloque']}
    */  
    visitBloque(node){
        const entorno_anterior = this.entornoActual
        this.entornoActual = new Entorno(entorno_anterior)

        node.dcls.forEach(dcl => dcl.accept(this))
        this.entornoActual = entorno_anterior

    }

    /** 
    * @type {BaseVisitor['visitIf']}
    */ 
    visitIf(node){
        const condicion = node.condicion.accept(this)

        if(condicion){
            node.sentenciasTrue.accept(this)
            return
        }

        if(node.sentenciasFalse){
            node.sentenciasFalse.accept(this)
        }


    }
    /** 
    * @type {BaseVisitor['visitWhile']}
    */ 
    visitWhile(node){   
        const entornoAnterior = this.entornoActual
        try {
            while(node.condicion.accept(this)){
                node.sentencias.accept(this)
            }
        } catch (error) {
            this.entornoActual = entornoAnterior

            if(error instanceof BreakException){
                //console.log("break")
                return
            }

            if(error instanceof ContinueException){
                //console.log("continue")
                return this.visitWhile(node)
            }

            throw error
        }

    }
    /** 
    * @type {BaseVisitor['visitFor']}
    */ 
    visitFor(node){
        const entornoAnterior = this.entornoActual

        try{

            if (node.inicializacion) {
                node.inicializacion.accept(this); // Puede ser una declaracion de variable o una asignacion
            }
        
            /*
            while (node.condicion.accept(this)) {
                node.sentencias.accept(this);
        
                if (node.actualizacion) {
                    node.actualizacion.accept(this);
                }
            }
            */
    
            // el for puede ir asi, ya que defina la variable o asignacion arriba, js puede ejecutar el for de esta forma
            for(; node.condicion.accept(this) ; node.actualizacion.accept(this)){
                try{

                    node.sentencias.accept(this)

                }catch (error){

                    if(error instanceof ContinueException){
                        continue
                    }
                    throw error
                }
            }

        }catch(error){
            this.entornoActual = entornoAnterior

            if(error instanceof BreakException){
                //console.log("break")
                return
            }

            throw error
        }


    }

    /** 
    * @type {BaseVisitor['visitBreak']}
    */ 
    visitBreak(node){
        throw new BreakException()
    }

    /** 
    * @type {BaseVisitor['visitContinue']}
    */ 
    visitContinue(node){
        throw new ContinueException()
    }
    
    /** 
    * @type {BaseVisitor['visitReturn']}
    */ 
    visitReturn(node){
        let valor = null
        if(node.exp){
            valor = node.exp.accept(this)   
            //console.log(valor + "en visit return")
        }
        throw new ReturnException(valor)
    }

    /** 
    * @type {BaseVisitor['visitLlamada']}
    */ 
    visitLlamada(node){
        const funcion = node.callee.accept(this)
        const argumentos = node.args.map(arg => arg.accept(this))
        console.log("ESTAMOS EN LLAMADA")
        console.log(argumentos)

        if(!(funcion instanceof Invocable)){
            throw new Error("No es invocable")
        }

        if(funcion.aridad() !== argumentos.length){
            throw new Error("Aridad incorrecta")
        }

        return funcion.invocar(this, argumentos)
    }

    /** 
    * @type {BaseVisitor['visitDeclaracionFuncion']}
    */ 
    visitDeclaracionFuncion(node){
        const funcion = new FuncionForanea(node, this.entornoActual)
        //this.entornoActual.set(node.id, funcion)
        this.entornoActual.set(node.id, { tipo: "function", valor: funcion })
    }

    /** 
    * @type {BaseVisitor['visitDeclaracionStruct']}
    */
    visitDeclaracionStruct(node){

        const metodos = {}
        const atributos = {}
        node.declaraciones.forEach(dcl => {
            if (dcl instanceof nodos.DeclaracionFuncion) {
                metodos[dcl.id] = new FuncionForanea(dcl, this.entornoActual);
            } else if (dcl instanceof nodos.DeclaracionVariable) {
                atributos[dcl.id] = dcl.exp
                
                atributos[dcl.id] = {
                    tipo: dcl.tipo,
                    valor: dcl.exp
                }
            }
        })


        const struct = new Struct(node.id, atributos, metodos)
        //this.entornoActual.set(node.id, struct) //COMENTADO 15/09 CORRIGIENDO STRUCT Y TIPADO
        this.entornoActual.set(node.id, { tipo: "struct", valor: struct })
    }

    

    /** 
    * @type {BaseVisitor['visitInstancia']}
    */
    visitInstancia(node){

        /*
        const struct = this.entornoActual.get(node.id)

        const argumentos = node.args.map(arg => arg.accept(this));

        if(!(struct instanceof Struct)){
            throw new Error("No es posible instanciar algo que no es una clase")
        }


        return struct.invocar(this, argumentos)

        COMENTADO EL 15/09
        */

        
        const resultado = this.entornoActual.get(node.id);

        // Asegúrate de que sea un Struct.
        if (resultado === undefined || resultado.tipo !== "struct") {
            throw new Error("No es posible instanciar algo que no es una clase")
        }
        //const struct = this.entornoActual.get(node.id); 
        const struct = resultado.valor;  // Ahora estamos seguros de que es un Struct
        //const argumentos = node.args.map(arg => arg.accept(this)) COMENTADO EL 16/09

        const argumentos = node.args.map(arg => ({
            id: arg.id,
            valor: arg.valor.accept(this) // Evaluar el valor del argumento
        }))


        return struct.invocar(this, argumentos)
        
    }

    /** 
    * @type {BaseVisitor['visitGet']}
    */

    visitGet(node){
        const instancia = node.objetivo.accept(this)

        if(!(instancia instanceof Instancia)) {
            throw new Error("No es posible obtener una propiedad de algo que no es una instancia")
        }

        return instancia.get(node.propiedad)
    }
    
    /** 
    * @type {BaseVisitor['visitSet']}
    */
    visitSet(node){
        const instancia =  node.objetivo.accept(this)

        if(!(instancia instanceof Instancia)){
            throw new Error("No es posible asignar una propiedad de algo que no es una instancia")
        }
        const valor = node.valor.accept(this)
        console.log("estamos imprimiendo valor en set del interprete "+ valor.tipo)
        //instancia.set(node.propiedad, valor)
        instancia.set(node.propiedad, {tipo: valor.tipo, valor: valor})

        return valor
    }
    /** 
    * @type {BaseVisitor['visitDeclaracionArreglo']}
    */
    visitDeclaracionArreglo(node){
        const nombreArreglo = node.id
        const tipoArreglo = node.tipo
        const valoresArreglo = node.valores
        let auxiliar
        let valoresSintetizados = []
        
        if (valoresArreglo instanceof AccesoVariable) {
            // por el "bug" hacemos esta validacion para obtener el arreglo desde AccesoVariable
            auxiliar = this.visitAccesoVariable(valoresArreglo)
            /* se obtiene al arreglo con un auxiliar, y asignamos valor a valor 
            porque si solo copiamos, cuando modifiquemos el arreglo original, por alguna razon la copia tambien obtiene esos valores
            */

            auxiliar.forEach(valores_a => {
                valoresSintetizados.push(valores_a)
            });

        }
    
        if(Array.isArray(valoresArreglo)){
            valoresArreglo.forEach(valores => {
                const valor_agregar = valores.accept(this)
                if (!this.validarTipoArreglo(tipoArreglo, valor_agregar)) {
                    throw new Error(`El valor ${valor_agregar} no es del tipo esperado para el arreglo ${nombreArreglo}`);
                }
                valoresSintetizados.push(valor_agregar)
            })
    
        } else if (valoresArreglo === null || valoresArreglo === undefined){
            valoresSintetizados = []
        }
        
        this.entornoActual.set(nombreArreglo, { tipo: tipoArreglo  + "[]" , valor: valoresSintetizados })

    }   

    /** 
    * @type {BaseVisitor['visitAccesoValorArreglo']}
    */
    visitAccesoValorArreglo(node){
        const nombreArreglo = node.id
        const posicionArreglo = node.posicion.accept(this)

        const valorArreglo = this.entornoActual.getValorArreglo(nombreArreglo, posicionArreglo)
        return valorArreglo
    }
    /** 
    * @type {BaseVisitor['visitAsignacionValorArreglo']}
    */
    visitAsignacionValorArreglo(node){
        const nombreArreglo = node.id
        const posicionArreglo = node.posicion.accept(this)
        const nuevoValor = node.asignacion.accept(this)

        this.entornoActual.asignarValorArreglo(nombreArreglo, posicionArreglo, nuevoValor)
        return nuevoValor

    }   
    /** 
    * @type {BaseVisitor['visitDeclaracionArregloReservado']}
    */
    visitDeclaracionArregloReservado(node){
        const tipoArreglo = node.tipo
        const nombreArreglo = node.id
        const espaciosArreglo = node.cantidad.accept(this)
        let valoresSintetizados = []

    
        switch(tipoArreglo){
            
            case "int":
                for(let i = 0; i<espaciosArreglo; i++){
                    valoresSintetizados.push(0)
                }
                break
            case "float":
                for(let i = 0; i<espaciosArreglo; i++){
                    valoresSintetizados.push(0.0)
                }
                break
            case "string":
                for(let i = 0; i<espaciosArreglo; i++){
                    valoresSintetizados.push("")
                }
                break
            case "boolean":
                for(let i = 0; i<espaciosArreglo; i++){
                    valoresSintetizados.push(false)
                }
                break
            case "char":
                for(let i = 0; i<espaciosArreglo; i++){
                    valoresSintetizados.push('\u0000')
                }
                break
            case "struct":
                for(let i = 0; i<espaciosArreglo; i++){
                    valoresSintetizados.push(null)
                }
                break
            default:
                throw new Error("Tipo de arreglo desconocido: " + tipoArreglo);
        }
        
        this.entornoActual.set(nombreArreglo, { tipo: tipoArreglo  + "[]" , valor: valoresSintetizados })
    }



    /** 
    * @type {BaseVisitor['visitFuncParseInt']}
    */
    visitFuncParseInt(node){
        let valor = node.exp.accept(this)
        return parseInt(valor)
    }

    /** 
    * @type {BaseVisitor['visitFuncParseFloat']}
    */
    visitFuncParseFloat(node){
        let valor = node.exp.accept(this)
        return parseFloat(valor)
    }
    /** 
    * @type {BaseVisitor['visitFuncToString']}
    */
    visitFuncToString(node){
        let valor = node.exp.accept(this)
        return valor.toString()
    }
    /** 
    * @type {BaseVisitor['visitFuncToLowerCase']}
    */
    visitFuncToLowerCase(node){
        let valor = node.exp.accept(this)
        return valor.toLowerCase()
    }
    /** 
    * @type {BaseVisitor['visitFuncToUpperCase']}
    */
    visitFuncToUpperCase(node){
        let valor = node.exp.accept(this)
        return valor.toUpperCase()
    }

    /** 
    * @type {BaseVisitor['visitFuncTypeOf']}
    */
    visitFuncTypeOf(node){
        let valor = node.exp.accept(this)
        let retorno = typeof valor
        console.log(retorno)
        if(retorno === "number"){
            if (Number.isInteger(valor)) {
                return "int";
            } else {
                return "float";
            }
        }

        if(retorno === "string"){
            if (valor.length === 1) {
                return "char";
            } else {
                return "string";
            }
        }
        
        return retorno
    }

    /** 
    * @type {BaseVisitor['visitFuncIndexOf']}
    */
    visitFuncIndexOf(node){
        const nArreglo = node.id
        const valor = node.exp.accept(this)
        const Arreglo = this.entornoActual.get(nArreglo)
        if(!Array.isArray(Arreglo)){
            throw new Error("Esta funcion debe ser usada con un Arreglo");
        }
        
        return Arreglo.indexOf(valor)
    }
    /** 
    * @type {BaseVisitor['visitFuncJoin']}
    */
    visitFuncJoin(node){
        const nArreglo = node.id
        const Arreglo = this.entornoActual.get(nArreglo)
        let retorno = ""
        if(!Array.isArray(Arreglo)){
            throw new Error("Esta funcion debe ser usada con un Arreglo");
        }

        for (let i = 0; i < Arreglo.length; i++) {
            
            retorno += Arreglo[i]
            console.log(Arreglo[i] + "SE AGREGO")
            if (i < Arreglo.length - 1) {
                retorno += ', '
            }
        }

        return retorno
    }



    /** 
    * @type {BaseVisitor['visitFuncLength']}
    */
    visitFuncLength(node){
        const nArreglo = node.id
        const Arreglo = this.entornoActual.get(nArreglo)
        if(!Array.isArray(Arreglo)){
            throw new Error("Esta funcion debe ser usada con un Arreglo");
        }

        return Arreglo.length
    }

    /** 
    * @type {BaseVisitor['visitSwitch']}
    */
    visitSwitch(node) {
        let valorInicial = node.inicial.accept(this)
        let casoEjecutado = false
        let ningunBreak = false
        // Se iteran los casos del switch
        console.log("imprimiendo casos " + node.casos.length)
        for (let i = 0; i < node.casos.length; i++) {
            const casoValor = node.casos[i].exp.accept(this) // Se obtiene el valor aca: " case valor_que_obtenemos: "

            if (casoValor === valorInicial || casoEjecutado) {
                casoEjecutado = true

                try {
                    for (const declaracion of node.casos[i].declaraciones) {
                        declaracion.accept(this)
                    }
                } catch (error) {
                    console.log("pasamos aca")
                    if (error instanceof BreakException) {
                        ningunBreak = false
                        return // Manejo del break correctamente
                    }
                    throw error
                }
                ningunBreak = true
            }
        }
        
        // Si no se ha ejecutado ningún caso, ejecutamos el bloque default, en dado caso si exista
        if (casoEjecutado && node.c_default && ningunBreak) {
            for (const declaracion of node.c_default.declaraciones_dflt) {
                declaracion.accept(this)
            }
        }
    }
    

    //Funcion Auxiliar para los Arreglos
    validarTipoArreglo(tipoArreglo, valor) {
        switch (tipoArreglo) {
            case "int":
                return Number.isInteger(valor);
            case "float":
                return typeof valor === 'number' && !Number.isInteger(valor);
            case "string":
                return typeof valor === 'string';
            case "boolean":
                return typeof valor === 'boolean';
            case "char":
                return typeof valor === 'string' && valor.length === 1;
            default:
                throw new Error("Tipo de arreglo desconocido: " + tipoArreglo);
        }
    }
}