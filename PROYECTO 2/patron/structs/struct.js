import { FuncionForanea } from "../funciones/foranea.js";
import { Invocable } from "../funciones/invocable.js";
import { Expresion } from "../nodos.js";
import { Instancia } from "./instancia.js";

export class Struct extends Invocable{

    constructor(nombre, atributos, metodos){
        super()


        /**
         * @type {string}
         */
        this.nombre = nombre

        /**
         * @type {Object.<string, Expresion>}
         */
        this.atributos = atributos

        /**
         * @type {Object.<string, FuncionForanea>}
         */
        this.metodos = metodos
    }


    /**
     * @param {string} nombre
     * @returns {FuncionForanea | null}
     */
    buscarMetodo(nombre){
        if(this.metodos.hasOwnProperty(nombre)){
            return this.metodos[nombre]
        }
        return null
    }

    aridad(){
        const constructor = this.buscarMetodo('constructor')

        if(constructor){
            return constructor.aridad()
        }

        return 0
    }

    /**
     * @type {Invocable['invocar']}
     */

    invocar(interprete, args){
        const nuevaInstancia = new Instancia(this)
        const mapaDeArgumentos = new Map(args.map(arg => [arg.id, arg.valor]));

        /*
        Object.entries(this.atributos).forEach(([nombre, {tipo, valor}]) => {

            if (valor === null || valor === undefined) {
                //valor = { accept: () => null }; //COMENTADO CUANDO ESTAMOS VIENDO LO DE LOS STRUCTS
                valor = this.obtenerValorPorDefecto(tipo);
            } else {
                valor = valor.accept(interprete)
            }
            const tipoAtributo = tipo
            const valorAtributo = valor
            //nuevaInstancia.set(nombre, valor.accept(interprete)); // CAMBIO ACA 15/09

            nuevaInstancia.set(nombre, {tipo: tipoAtributo, valor: valorAtributo})
        })
        comentado el 16/09, es lo que funciona antes de la nueva forma de instancia
        */

        Object.entries(this.atributos).forEach(([nombre, { tipo, valor }]) => {
            // Si hay un valor en los argumentos para el nombre del atributo, se le asigna ese valor que viene
            if (mapaDeArgumentos.has(nombre)) {
                const valorAtributo = mapaDeArgumentos.get(nombre);
                nuevaInstancia.set(nombre, { tipo: tipo, valor: valorAtributo });
            } else {
                // Si no hay valor en los argumentos, usamos el valor por defecto 
                let valorAtributo;

                if (valor === null || valor === undefined) {
                    valorAtributo = this.obtenerValorPorDefecto(tipo);
                } else {
                    valorAtributo = valor.accept(interprete);
                }
    
                nuevaInstancia.set(nombre, { tipo: tipo, valor: valorAtributo });
            }
        })

        const constructor = this.buscarMetodo('constructor')
        if(constructor){
            constructor.atar(nuevaInstancia).invocar(interprete, args)
        }


        return nuevaInstancia
    }


    //CAMBIO ACA 15/09
    /**
     * @param {string} tipo
     * @returns {any}
     */
    obtenerValorPorDefecto(tipo) {
        switch (tipo) {
            case "string":
                return ""
            case "int":
                return 0
            case "float":
                return 0
            case "boolean":
                return false
            default:
                return null;
        }
    }
}