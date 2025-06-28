import type { Schema, Struct } from '@strapi/strapi';

export interface PagePropertiesBanner extends Struct.ComponentSchema {
  collectionName: 'components_page_properties_banners';
  info: {
    displayName: 'banner';
    icon: 'picture';
  };
  attributes: {
    backgroundImage: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    buttonOneLabel: Schema.Attribute.String;
    buttonOneLink: Schema.Attribute.String;
    buttonTwoLabel: Schema.Attribute.String;
    buttonTwoLink: Schema.Attribute.String;
    showContent: Schema.Attribute.Boolean;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface PagePropertiesFooter extends Struct.ComponentSchema {
  collectionName: 'components_page_properties_footers';
  info: {
    displayName: 'footer';
    icon: 'message';
  };
  attributes: {
    facebookLink: Schema.Attribute.String;
    instagramLink: Schema.Attribute.String;
    linkedInLink: Schema.Attribute.String;
    tiktokLink: Schema.Attribute.String;
    twitterLink: Schema.Attribute.String;
    youtubeLink: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'page-properties.banner': PagePropertiesBanner;
      'page-properties.footer': PagePropertiesFooter;
    }
  }
}
