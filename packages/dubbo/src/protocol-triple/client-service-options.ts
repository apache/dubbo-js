export type TripleClientServiceOptions = {
  /**
      * The Dubbo framework supports a service isolation mechanism based on groups and versions,
      * so the Triple protocol introduces tri-service-group and tri-service-version support.
      * The serviceVersion needs to be passed during registration to
      * match the TRI-Service-Version request header field.
      */
  serviceVersion?: string;

  /**
    * The Dubbo framework supports a service isolation mechanism based on groups and versions,
    * so the Triple protocol introduces tri-service-group and tri-service-version support.
    * The serviceGroup needs to be passed during registration to
    * match the TRI-Service-Group request header field.
    */
  serviceGroup?: string;
}